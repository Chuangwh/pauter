import * as utils from '../../lib/utils.js';
import putility from "@heyputer/putility";
import { TeePromise } from "@heyputer/putility/src/libs/promise";
import getAbsolutePathForApp from './utils/getAbsolutePathForApp.js';

export const TFilesystem = 'TFilesystem';

// TODO: UNUSED (eventually putility will support these definitions)
//       This is here so that the idea is not forgotten.
export const IFilesystem = {
    methods: {
        stat: {
            parameters: {
                path: {
                    alias: 'uid',
                }
            }
        }
    }

};

export class PuterAPIFilesystem extends putility.AdvancedBase {
    constructor ({ api_info }) {
        super();
        this.api_info = api_info;
    }

    static IMPLEMENTS = {
        [TFilesystem]: {
            stat: async function (options) {
                this.ensure_auth_();
                const tp = new TeePromise();

                const xhr = new utils.initXhr('/stat', this.api_info.APIOrigin, this.api_info.authToken);
                utils.setupXhrEventHandlers(xhr, undefined, undefined,
                    tp.resolve.bind(tp),
                    tp.reject.bind(tp),
                );

                let dataToSend = {};
                if (options.uid !== undefined) {
                    dataToSend.uid = options.uid;
                } else if (options.path !== undefined) {
                    // If dirPath is not provided or it's not starting with a slash, it means it's a relative path
                    // in that case, we need to prepend the app's root directory to it
                    dataToSend.path = getAbsolutePathForApp(options.path);
                }

                dataToSend.return_subdomains = options.returnSubdomains;
                dataToSend.return_permissions = options.returnPermissions;
                dataToSend.return_versions = options.returnVersions;
                dataToSend.return_size = options.returnSize;

                xhr.send(JSON.stringify(dataToSend));

                return await tp;
            },
            readdir: async function (options) {
                this.ensure_auth_();
                const tp = new TeePromise();

                const xhr = new utils.initXhr('/readdir', this.api_info.APIOrigin, this.api_info.authToken);
                utils.setupXhrEventHandlers(xhr, undefined, undefined,
                    tp.resolve.bind(tp),
                    tp.reject.bind(tp),
                );

                xhr.send(JSON.stringify({path: getAbsolutePathForApp(options.path)}));

                return await tp;
            },
        }
    }

    ensure_auth_ () {
        // TODO: remove reference to global 'puter'; get 'env' via context
        if ( ! this.api_info.authToken && puter.env === 'web' ) {
            try {
                this.ui.authenticateWithPuter();
            } catch (e) {
                throw new Error('Authentication failed.');
            }
        }
    }
}

export class ProxyFilesystem extends putility.AdvancedBase {
    static PROPERTIES = {
        delegate: () => {}, 
    }
    // TODO: constructor implied by properties
    constructor ({ delegate }) {
        super();
        this.delegate = delegate;
    }
    static IMPLEMENTS = {
        [TFilesystem]: {
            stat: async function (o) {
                return this.delegate.stat(o);
            },
            readdir: async function (o) {
                return this.delegate.readdir(o);
            }
        }
    }
}
