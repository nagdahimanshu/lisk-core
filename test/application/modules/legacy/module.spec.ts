/*
 * Copyright © 2022 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */

import { BaseModule, codec, cryptography } from 'lisk-sdk';
import { when } from 'jest-when';

import { LegacyModule } from '../../../../src/application/modules';
import { LegacyAPI } from '../../../../src/application/modules/legacy/api';
import { LegacyEndpoint } from '../../../../src/application/modules/legacy/endpoint';
import {
	MODULE_NAME_LEGACY,
	MODULE_ID_LEGACY,
	LEGACY_ACC_MAX_TOTAL_BAL_NON_INC,
} from '../../../../src/application/modules/legacy/constants';
import { genesisLegacyStoreSchema } from '../../../../src/application/modules/legacy/schemas';
import { genesisLegacyStoreData } from '../../../../src/application/modules/legacy/types';

const getLegacyBytesFromPassphrase = (passphrase: string): Buffer => {
	const { publicKey } = cryptography.getAddressAndPublicKeyFromPassphrase(passphrase);
	return cryptography.getFirstEightBytesReversed(cryptography.hash(publicKey));
};

const getContext = (legacySubstore: genesisLegacyStoreData, getStore: any): any => {
	const mockAssets = codec.encode(genesisLegacyStoreSchema, legacySubstore);
	return {
		assets: {
			getAsset: () => mockAssets,
		},
		getStore,
	} as any;
};

describe('LegacyModule', () => {
	let legacyModule: LegacyModule;
	interface Accounts {
		[key: string]: {
			passphrase: string;
		};
	}

	const testAccounts: Accounts = {
		account1: {
			passphrase: 'float slow tiny rubber seat lion arrow skirt reveal garlic draft shield',
		},
		account2: {
			passphrase: 'hand nominee keen alarm skate latin seek fox spring guilt loop snake',
		},
		account3: {
			passphrase: 'february large secret save risk album opera rebel tray roast air captain',
		},
	};

	beforeAll(() => {
		legacyModule = new LegacyModule();
	});

	it('should inherit from BaseModule', () => {
		expect(LegacyModule.prototype).toBeInstanceOf(BaseModule);
	});

	describe('constructor', () => {
		it('should have valid id', () => {
			expect(legacyModule.id).toBe(MODULE_ID_LEGACY);
		});

		it('should have valid name', () => {
			expect(legacyModule.name).toBe(MODULE_NAME_LEGACY);
		});

		it('should expose endpoint', () => {
			expect(legacyModule).toHaveProperty('endpoint');
			expect(legacyModule.endpoint).toBeInstanceOf(LegacyEndpoint);
		});

		it('should expose api', () => {
			expect(legacyModule).toHaveProperty('api');
			expect(legacyModule.api).toBeInstanceOf(LegacyAPI);
		});
	});

	describe('init', () => {
		it('should initialize config with defaultConfig', async () => {
			const moduleConfig = { tokenIDReclaim: { chainID: 0, localID: 0 } } as any;
			await expect(legacyModule.init({ moduleConfig: {} })).resolves.toBeUndefined();
			expect(legacyModule['_moduleConfig']).toEqual(moduleConfig);
		});
	});

	describe('initGenesisState', () => {
		let storeData: genesisLegacyStoreData;
		const mockSetWithSchema = jest.fn();
		const mockStoreHas = jest.fn();

		const getStore: any = () => ({
			setWithSchema: mockSetWithSchema,
			has: mockStoreHas,
		});

		beforeEach(() => {
			storeData = { legacySubstore: [] };
			for (const account of Object.values(testAccounts)) {
				storeData.legacySubstore.push({
					address: getLegacyBytesFromPassphrase(account.passphrase),
					balance: BigInt(Math.floor(Math.random() * 1000)),
				});
			}
		});

		it('should save legacy accounts to state store if accounts are valid', async () => {
			const genesisBlockExecuteContextInput = getContext(storeData, getStore);
			await legacyModule.initGenesisState(genesisBlockExecuteContextInput);

			for (const account of storeData.legacySubstore) {
				when(mockStoreHas).calledWith(account.address).mockReturnValue(true);
				const isAccountInStore = await genesisBlockExecuteContextInput
					.getStore()
					.has(account.address);
				expect(isAccountInStore).toBe(true);
			}
		});

		it('should reject the block when address entries are not pair-wise distinct', async () => {
			const genesisBlockExecuteContextInput = getContext(
				{ legacySubstore: [...storeData.legacySubstore, ...storeData.legacySubstore] },
				getStore,
			);

			await expect(
				legacyModule.initGenesisState(genesisBlockExecuteContextInput),
			).rejects.toThrow();
		});

		it('should save legacy accounts to state store when total balance for all legacy accounts is less than 2^64', async () => {
			const currentTotalBalance = storeData.legacySubstore.reduce(
				(total, account) => total + account.balance,
				BigInt('0'),
			);

			storeData.legacySubstore.push({
				address: getLegacyBytesFromPassphrase(
					'dolphin curious because horror unfold smoke write type badge ecology say pet',
				),
				balance: BigInt(LEGACY_ACC_MAX_TOTAL_BAL_NON_INC) - currentTotalBalance - BigInt('1'),
			});
			const genesisBlockExecuteContextInput = getContext(storeData, getStore);
			await legacyModule.initGenesisState(genesisBlockExecuteContextInput);

			for (const account of storeData.legacySubstore) {
				when(mockStoreHas).calledWith(account.address).mockReturnValue(true);
				const isAccountInStore = await genesisBlockExecuteContextInput
					.getStore()
					.has(account.address);
				expect(isAccountInStore).toBe(true);
			}
		});

		it('should reject the block when total balance for all legacy accounts equals 2^64', async () => {
			const currentTotalBalance = storeData.legacySubstore.reduce(
				(total, account) => total + account.balance,
				BigInt('0'),
			);

			storeData.legacySubstore.push({
				address: getLegacyBytesFromPassphrase(
					'strategy phone follow wait moon figure cart primary comic recall silver donate',
				),
				balance: BigInt(LEGACY_ACC_MAX_TOTAL_BAL_NON_INC) - currentTotalBalance,
			});
			const genesisBlockExecuteContextInput = getContext(storeData, getStore);

			await expect(
				legacyModule.initGenesisState(genesisBlockExecuteContextInput),
			).rejects.toThrow();
		});

		it('should reject the block when total balance for all legacy accounts is greater than 2^64', async () => {
			storeData.legacySubstore.push({
				address: getLegacyBytesFromPassphrase(
					'elephant version solar amused enhance fuel black armor vendor regular tortoise tank',
				),
				balance: BigInt(LEGACY_ACC_MAX_TOTAL_BAL_NON_INC),
			});
			const genesisBlockExecuteContextInput = getContext(storeData, getStore);

			await expect(
				legacyModule.initGenesisState(genesisBlockExecuteContextInput),
			).rejects.toThrow();
		});

		it('should reject the block when address property of accounts is invalid', async () => {
			const invalidLegacyAccountAddresses = ['02089ca', '0208930ca', '4644873072065426945L'];
			for (const invalidLegacyAddress of invalidLegacyAccountAddresses) {
				const updatedStoreData = { legacySubstore: [...storeData.legacySubstore] };
				updatedStoreData.legacySubstore.push({
					address: Buffer.from(invalidLegacyAddress),
					balance: BigInt(Math.floor(Math.random()) * 1000),
				});
				const genesisBlockExecuteContextInput = getContext(updatedStoreData as any, getStore);

				await expect(
					legacyModule.initGenesisState(genesisBlockExecuteContextInput),
				).rejects.toThrow();
			}
		});
	});
});
