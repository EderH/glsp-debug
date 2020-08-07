/********************************************************************************
 * Copyright (c) 2019 EclipseSource and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/
import { LabelProvider, WidgetManager } from "@theia/core/lib/browser";
import { TreeElement, TreeSource } from "@theia/core/lib/browser/source-tree";
import { DebugState } from "@theia/debug/lib/browser/debug-session";
import { DebugSessionManager } from "@theia/debug/lib/browser/debug-session-manager";
import { DebugViewModel } from "@theia/debug/lib/browser/view/debug-view-model";
import { DebugWidget } from "@theia/debug/lib/browser/view/debug-widget";
import { inject, injectable, postConstruct } from "inversify";
import debounce = require("p-debounce");

import { DebugGLSPEditorManager } from "../debug-glsp-editor-manager";
import { GLSPDebugSession } from "../glsp-debug-session";
import { DebugGLSPEvent } from "../model/debug-glsp-event";



@injectable()
export class DebugGLSPEventsSource extends TreeSource {

    @inject(DebugSessionManager)
    protected readonly manager: DebugSessionManager;
    @inject(DebugGLSPEditorManager)
    protected readonly editorManager: DebugGLSPEditorManager;
    @inject(LabelProvider)
    protected readonly labelProvider: LabelProvider;
    @inject(WidgetManager) protected readonly widgetManager: WidgetManager;
    private viewModel: DebugViewModel;

    constructor() {
        super({
            placeholder: 'No events'
        });
    }

    @postConstruct()
    protected init(): void {
        this.fireDidChange();
        this.widgetManager.onDidCreateWidget(({ factoryId, widget }) => {
            if (factoryId === DebugWidget.ID && widget instanceof DebugWidget) {
                this.viewModel = widget['sessionWidget']['model'];
                this.toDispose.push(this.viewModel.onDidChange(() => this.refresh()));
            }
        });
    }

    protected readonly refresh = debounce(() => this.fireDidChange(), 100);

    getCurrentSession(): GLSPDebugSession | undefined {
        if (this.viewModel) {
            let currentSession = this.viewModel.currentSession;
            if (!currentSession) {
                currentSession = this.manager.currentSession;
            }
            if (currentSession && currentSession instanceof GLSPDebugSession) {
                return currentSession;
            }
        }

        return undefined;
    }

    getGLSPDebugEventFlow(): DebugGLSPEvent[] | undefined {
        const session = this.getCurrentSession();
        if (session && session.state > DebugState.Initializing) {
            return session.getGLSPDebugEvents();
        }
        return undefined;
    }

    *getElements(): IterableIterator<TreeElement> {
        const eventFlow = this.getGLSPDebugEventFlow();
        if (eventFlow) {
            for (const event of eventFlow) {
                yield event;
            }
        }
    }
}
