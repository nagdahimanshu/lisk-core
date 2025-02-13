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

import { BaseEndpoint, chain, cryptography, testing } from 'lisk-sdk';
import { when } from 'jest-when';

import { LegacyModule } from '../../../../src/application/modules';
import { LegacyEndpoint } from '../../../../src/application/modules/legacy/endpoint';
import { legacyAccountResponseSchema } from '../../../../src/application/modules/legacy/schemas';

const {
	getAddressAndPublicKeyFromPassphrase,
	getLegacyAddressFromPassphrase,
	getRandomBytes,
} = cryptography;
const { NotFoundError } = chain;

describe('LegacyEndpoint', () => {
	let legacyModule: LegacyModule;
	let legacyEndpoint: LegacyEndpoint;

	const mockGetWithSchema = jest.fn();
	const mockStoreHas = jest.fn();

	const stateStore: any = {
		getStore: () => ({
			getWithSchema: mockGetWithSchema,
			has: mockStoreHas,
		}),
	};

	interface Accounts {
		[key: string]: {
			passphrase: string;
			publicKey?: Buffer;
			address?: Buffer;
		};
	}

	const accounts: Accounts = {
		existingAccount: {
			passphrase: 'inherit moon normal relief spring bargain hobby join baby flash fog blood',
		},
	};

	for (const account of Object.values(accounts)) {
		const { address, publicKey } = getAddressAndPublicKeyFromPassphrase(account.passphrase);
		account.address = address;
		account.publicKey = publicKey;
	}

	const existingPublicKey = accounts.existingAccount.publicKey as Buffer;
	const nonExistingPublicKey = getRandomBytes(32);

	beforeEach(() => {
		legacyModule = new LegacyModule();
		legacyEndpoint = legacyModule.endpoint;
	});

	it('should inherit from BaseEndpoint', () => {
		expect(LegacyEndpoint.prototype).toBeInstanceOf(BaseEndpoint);
	});

	describe('constructor', () => {
		it('should be of the correct type', () => {
			expect(legacyEndpoint).toBeInstanceOf(LegacyEndpoint);
		});

		it("should expose 'getLegacyAccount'", () => {
			expect(typeof legacyEndpoint.getLegacyAccount).toBe('function');
		});
	});

	describe('getLegacyAccount', () => {
		it('should get the balance successfully for an existing legacy account', async () => {
			const context = testing.createTransientModuleEndpointContext({
				stateStore,
				params: {
					publicKey: existingPublicKey.toString('hex'),
				},
			});

			const expectedLegacyAccount = {
				legacyAddress: getLegacyAddressFromPassphrase(accounts.existingAccount.passphrase),
				balance: '1000',
			};

			when(mockStoreHas).calledWith(existingPublicKey).mockReturnValue(true);
			when(mockGetWithSchema)
				.calledWith(
					Buffer.from(expectedLegacyAccount.legacyAddress, 'hex'),
					legacyAccountResponseSchema,
				)
				.mockReturnValue(expectedLegacyAccount);

			const legacyAccount = await legacyEndpoint.getLegacyAccount(context);
			expect(legacyAccount).toBeDefined();
			expect(legacyAccount).toHaveProperty('legacyAddress', expectedLegacyAccount.legacyAddress);
			expect(legacyAccount).toHaveProperty('balance', expectedLegacyAccount.balance);
		});

		it('should get undefined for a non-existing legacy account', async () => {
			const context = testing.createTransientModuleEndpointContext({
				stateStore,
				params: {
					publicKey: nonExistingPublicKey.toString('hex'),
				},
			});

			when(mockStoreHas).calledWith(nonExistingPublicKey).mockReturnValue(false);
			when(mockGetWithSchema)
				.calledWith(nonExistingPublicKey, legacyAccountResponseSchema)
				.mockRejectedValue(new NotFoundError(Buffer.alloc(0).toString('hex')));

			const legacyAccount = await legacyEndpoint.getLegacyAccount(context);
			expect(legacyAccount).toBeUndefined();
		});
	});
});
