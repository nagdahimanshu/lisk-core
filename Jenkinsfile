properties([
	parameters([
		string(name: 'COMMITISH_SDK', description: 'Commit-ish of LiskHQ/lisk-sdk to use', defaultValue: 'development' ),
		string(name: 'COMMITISH_CORE', description: 'Commit-ish of LiskHQ/lisk-core to use', defaultValue: 'development' ),
	])
])

pipeline {
	agent { node { label 'lisk-build' } }
	options {
		skipDefaultCheckout()
		timeout(time: 10, unit: 'MINUTES')
	}
	stages {
		stage('Checkout SCM') {
			steps {
				cleanWs()
				dir('lisk-sdk') {
					checkout([$class: 'GitSCM', branches: [[name: "${params.COMMITISH_SDK}" ]], userRemoteConfigs: [[url: 'https://github.com/LiskHQ/lisk-sdk']]])
				}
				dir('lisk-core') {
					checkout([$class: 'GitSCM', branches: [[name: "${params.COMMITISH_CORE}" ]], userRemoteConfigs: [[url: 'https://github.com/LiskHQ/lisk-core']]])
					sh '''
					jq '.version="'"$( jq --raw-output .version package.json )-$( cd ../lisk-sdk && git rev-parse HEAD )-$( git rev-parse HEAD )"'"' package.json >package.json_
					mv package.json_ package.json
					if s3cmd --quiet info "s3://lisk-releases/core/core-v$( jq --raw-output .version package.json )-linux-x64.tar.gz" 2>/dev/null; then
						echo "Build already exists."
						exit 1
					fi
					'''
				}
			}
		}
		stage('Build SDK') {
			steps {
				dir('lisk-sdk') {
					nvm(readFile(".nvmrc").trim()) {
						sh '''
						npm install --global yarn
						yarn
						yarn build
						npx lerna exec yarn unlink
						npx lerna exec yarn link
						npx lerna --loglevel error list >../packages
						'''
					}
				}
			}
		}
		stage('Build Core') {
			steps {
				dir('lisk-core') {
					nvm(readFile(".nvmrc").trim()) {
						sh '''
						npm install --registry https://npm.lisk.io/
						npm install --global yarn
						for package in $( cat ../packages ); do
						  yarn link "$package"
						done
						npm run build
						'''
					}
				}
			}
		}
		stage('Test Core') {
			steps {
				dir('lisk-core') {
					nvm(readFile(".nvmrc").trim()) {
						sh 'npm test'
					}
				}
			}
		}
		stage('Pack Core build') {
			steps {
				dir('lisk-core') {
					nvm(readFile(".nvmrc").trim()) {
						sh './node_modules/.bin/oclif-dev pack --targets=linux-x64'
					}
				}
			}
		}
		stage('Upload Core build') {
			steps {
				dir('lisk-core') {
					sh '''
					core_version="$( jq --raw-output .version package.json )"
					cd dist/channels/beta/core-v${core_version}
					sha256sum "core-v${core_version}-linux-x64.tar.gz" >"core-v${core_version}-linux-x64.tar.gz.SHA256"
					s3cmd put --acl-public "core-v${core_version}-linux-x64.tar.gz"        "s3://lisk-releases/core/core-v${core_version}-linux-x64.tar.gz"
					s3cmd put --acl-public "core-v${core_version}-linux-x64.tar.gz.SHA256" "s3://lisk-releases/core/core-v${core_version}-linux-x64.tar.gz.SHA256"
					'''
				}
			}
		}
	}
}
// vim: filetype=groovy
