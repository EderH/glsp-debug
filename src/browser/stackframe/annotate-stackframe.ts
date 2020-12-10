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
import { AnnotateStackAction, ClearStackAnnotationAction } from "@eclipse-glsp/client-debug";
import { ApplicationShell } from "@theia/core/lib/browser";
import URI from "@theia/core/lib/common/uri";
import { DebugSession } from "@theia/debug/lib/browser/debug-session";
import { DebugSource } from "@theia/debug/lib/browser/model/debug-source";
import { DebugStackFrame } from "@theia/debug/lib/browser/model/debug-stack-frame";
import { DiagramWidget } from "sprotty-theia";

export class AnnotateStackFrame {

    private shell: ApplicationShell;
    private currentFrame: DebugStackFrame;
    private session: DebugSession;

    constructor(session: DebugSession, shell: ApplicationShell) {
        this.session = session;
        this.shell = shell;
        this.session.onDidChange(() => this.annotateStackFrame());
    }

    findWidget(diagramUri: string): DiagramWidget | undefined {
        const widgets = this.shell.getWidgets("main").filter(w => w instanceof DiagramWidget) as DiagramWidget[];
        const widget = widgets.find(w => w.uri.path.base === diagramUri);
        if (widget) {
            return widget;
        }
        return undefined;
    }

    public annotateStackFrame(): void {
        if (this.session.currentFrame && (this.currentFrame !== this.session.currentFrame)) {
            if (this.currentFrame) {
                this.clearStackAnnotation();
            }
            this.currentFrame = this.session.currentFrame;
            if (this.currentFrame.source) {
                const widget = this.findWidget(this.currentFrame.source.uri.path.base);
                if (widget) {
                    widget.actionDispatcher.dispatch(new AnnotateStackAction(this.currentFrame.raw.name));
                }
            }
        }
    }

    public clearStackAnnotation(): void {
        if (this.currentFrame.source) {
            const widget = this.findWidget(this.currentFrame.source.uri.path.base);
            if (widget) {
                widget.actionDispatcher.dispatch(new ClearStackAnnotationAction(this.currentFrame.raw.name));
            }
        }
    }

    get source(): DebugSource | undefined {
        return this.currentFrame && this.currentFrame.source && this.session && this.session.getSource(this.currentFrame.source);
    }

    get uri(): URI | undefined {
        return this.currentFrame && this.currentFrame.source && this.currentFrame.source.uri;
    }
}
