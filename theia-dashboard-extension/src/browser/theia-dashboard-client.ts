/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import {injectable, inject} from 'inversify';
import {FrontendApplicationContribution, FrontendApplication} from '@theia/core/lib/browser';
import {EnvVariablesServer, EnvVariable} from '@theia/core/lib/common/env-variables';
import {FrontendApplicationStateService} from '@theia/core/lib/browser/frontend-application-state';
import '../../src/browser/style/che-theia-dashboard-module.css';

const THEIA_ICON_ID = 'theia:icon';

/**
 * Provides basic Eclipse Che Theia Dashboard extension that adds Show/Hide Dashboard button to the top menu.
 */
@injectable()
export class TheiaDashboardClient implements FrontendApplicationContribution {
    private isExpanded: boolean = false;

    constructor(@inject(EnvVariablesServer) private readonly envVariablesServer: EnvVariablesServer,
                @inject(FrontendApplicationStateService) protected readonly frontendApplicationStateService: FrontendApplicationStateService) {
        this.frontendApplicationStateService.reachedState('ready').then(() => this.onReady());
    }

    async onStart(app: FrontendApplication): Promise<void> {
        // load this module at FrontendApplication startup
    }

    async onReady() {
        const logoEl: HTMLElement | null = document.getElementById(THEIA_ICON_ID);
        if (!logoEl || !logoEl.parentElement) {
            return;
        }

        const isInFrame = window !== window.parent;
        const dashboardEl: HTMLElement = document.createElement('div');
        dashboardEl.className = 'che-dashboard';
        const arrowEl: HTMLElement = document.createElement(isInFrame ? 'i' : 'a');
        arrowEl.className = 'fa fa-chevron-left';
        dashboardEl.appendChild(arrowEl);
        logoEl!.parentElement!.replaceChild(dashboardEl, logoEl!);

        if (!isInFrame) {
            arrowEl.setAttribute('target', '_blank');
            const href = await this.getDashboardWorkspaceUrl();
            if (href === undefined) {
                return;
            }
            arrowEl.setAttribute('href', href!);
            arrowEl.title = 'Open with navigation bar';

            return;
        }

        arrowEl.setAttribute('title', 'Hide navigation bar');
        arrowEl.addEventListener('click', () => {
            this.isExpanded = !this.isExpanded;
            window.parent.postMessage(this.isExpanded ? 'hide-navbar' : 'show-navbar', '*');
            arrowEl.className = `fa fa-chevron-${this.isExpanded ? 'right' : 'left'}`;
            arrowEl.title = `${this.isExpanded ? 'Show' : 'Hide'} navigation bar`;
        });
    }

    async getDashboardWorkspaceUrl(): Promise<string | undefined> {
        const envVariables: EnvVariable[] = await this.envVariablesServer.getVariables();
        if (!envVariables) {
            return undefined;
        }
        let ideWorkspaceUrl: string | undefined;
        let apiExternal: string | undefined;
        let namespace: string | undefined;
        let workspaceName: string | undefined;
        envVariables.forEach((envVariable) => {
            if (envVariable.name === 'CHE_API_EXTERNAL') {
                if (!envVariable.value) {
                    return;
                }
                const match = envVariable.value.match(/^(https?:\/\/[^/]*)/i);
                if (match && match[1]) {
                    apiExternal = match[1];
                }
            } else if (envVariable.name === 'CHE_WORKSPACE_NAMESPACE') {
                namespace =  envVariable.value;
            } else if (envVariable.name === 'CHE_WORKSPACE_NAME') {
                workspaceName =  envVariable.value;
            }
            if (apiExternal && namespace && workspaceName) {
                ideWorkspaceUrl = `${apiExternal}/dashboard/#/${namespace}/${workspaceName}`;
                return;
            }
        });

        return ideWorkspaceUrl;
    }

}
