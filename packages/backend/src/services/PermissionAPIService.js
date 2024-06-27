const { APIError } = require("openai");
const configurable_auth = require("../middleware/configurable_auth");
const { Endpoint } = require("../util/expressutil");
const { whatis } = require("../util/langutil");
const BaseService = require("./BaseService");

class PermissionAPIService extends BaseService {
    static MODULES = {
        express: require('express'),
    };

    async ['__on_install.routes'] (_, { app }) {
        app.use(require('../routers/auth/get-user-app-token'))
        app.use(require('../routers/auth/grant-user-app'))
        app.use(require('../routers/auth/revoke-user-app'))
        app.use(require('../routers/auth/grant-user-user'));
        app.use(require('../routers/auth/revoke-user-user'));
        app.use(require('../routers/auth/grant-user-group'));
        app.use(require('../routers/auth/revoke-user-group'));
        app.use(require('../routers/auth/list-permissions'))
        
        // track: scoping iife
        const r_group = (() => {
            const require = this.require;
            const express = require('express');
            return express.Router()
        })();

        this.install_group_endpoints_({ router: r_group });
        app.use('/group', r_group);
    }
    
    install_group_endpoints_ ({ router }) {
        Endpoint({
            route: '/create',
            methods: ['POST'],
            mw: [configurable_auth()],
            handler: async (req, res) => {
                const owner_user_id = req.user.id;
                
                const extra = req.body.extra ?? {};
                const metadata = req.body.metadata ?? {};
                if ( whatis(extra) !== 'object' ) {
                    throw APIError.create('field_invalid', null, {
                        key: 'extra',
                        expected: 'object',
                        got: whatis(extra),
                    })
                }
                if ( whatis(metadata) !== 'object' ) {
                    throw APIError.create('field_invalid', null, {
                        key: 'metadata',
                        expected: 'object',
                        got: whatis(metadata),
                    })
                }

                const svc_group = this.services.get('group');
                const uid = await svc_group.create({
                    owner_user_id,
                    // TODO: allow specifying these in request
                    extra: {},
                    metadata: {},
                });
                
                res.json({ uid });
            }
        }).attach(router);
        
        Endpoint({
            route: '/add-users',
            methods: ['POST'],
            mw: [configurable_auth()],
            handler: async (req, res) => {
                const svc_group = this.services.get('group')
                
                // TODO: validate string and uuid for request

                const group = await svc_group.get(
                    { uid: req.body.uid });
                
                if ( ! group ) {
                    throw APIError.create('entity_not_found', null, {
                        identifier: req.body.uid,
                    })
                }
                
                if ( group.owner_user_id !== req.user.id ) {
                    throw APIError.create('forbidden');
                }
                
                if ( whatis(req.body.users) !== 'array' ) {
                    throw APIError.create('field_invalid', null, {
                        key: 'users',
                        expected: 'array',
                        got: whatis(req.body.users),
                    });
                }
                
                for ( let i=0 ; i < req.body.users.length ; i++ ) {
                    const value = req.body.users[i];
                    if ( whatis(value) === 'string' ) continue;
                    throw APIError.create('field_invalid', null, {
                        key: `users[${i}]`,
                        expected: 'string',
                        got: whatis(value),
                    });
                }
                
                await svc_group.add_users({
                    uid: req.body.uid,
                    users: req.body.users,
                });
                
                res.json({});
            }
        }).attach(router);

        // TODO: DRY: add-users is very similar
        Endpoint({
            route: '/remove-users',
            methods: ['POST'],
            mw: [configurable_auth()],
            handler: async (req, res) => {
                const svc_group = this.services.get('group')
                
                // TODO: validate string and uuid for request

                const group = await svc_group.get(
                    { uid: req.body.uid });
                
                if ( ! group ) {
                    throw APIError.create('entity_not_found', null, {
                        identifier: req.body.uid,
                    })
                }

                if ( group.owner_user_id !== req.user.id ) {
                    throw APIError.create('forbidden');
                }
                
                if ( whatis(req.body.users) !== 'array' ) {
                    throw APIError.create('field_invalid', null, {
                        key: 'users',
                        expected: 'array',
                        got: whatis(req.body.users),
                    });
                }
                
                for ( let i=0 ; i < req.body.users.length ; i++ ) {
                    const value = req.body.users[i];
                    if ( whatis(value) === 'string' ) continue;
                    throw APIError.create('field_invalid', null, {
                        key: `users[${i}]`,
                        expected: 'string',
                        got: whatis(value),
                    });
                }
                
                await svc_group.remove_users({
                    uid: req.body.uid,
                    users: req.body.users,
                });
                
                res.json({});
            }
        }).attach(router);
    }
}

module.exports = {
    PermissionAPIService,
};
