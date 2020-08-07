/********************************************************************************
 * Copyright (C) 2018 TypeFox and others.
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
import { LabelProvider, WidgetOpenerOptions } from "@theia/core/lib/browser";
import { TreeElement } from "@theia/core/lib/browser/source-tree";
import URI from "@theia/core/lib/common/uri";
import { DebugSession } from "@theia/debug/lib/browser/debug-session";
import { DebugSource } from "@theia/debug/lib/browser/model/debug-source";
import { EditorManager } from "@theia/editor/lib/browser";
import * as React from "react";


export class DebugEventOptions {
    readonly labelProvider: LabelProvider;
    readonly editorManager: EditorManager;
    readonly session: DebugSession;
}

export class DebugGLSPEvent extends DebugEventOptions implements TreeElement {

    readonly id: number;
    readonly name: string;
    readonly elementID: string;
    readonly uri: URI;

    constructor(
        readonly entry: any,
        readonly options: DebugEventOptions
    ) {
        super();
        Object.assign(this, options);
        this.id = entry.id;
        this.elementID = entry.elementID;
        this.name = entry.name;
        this.uri = new URI('/' + entry.file);
    }

    protected _source: DebugSource | undefined;

    get source(): DebugSource | undefined {
        return this._source = this.uri && this.session.getSourceForUri(this.uri);
    }



    async open(options: WidgetOpenerOptions = {
        mode: 'reveal'
    }): Promise<void> {
        if (this.source) {
            await this.source.open({
                ...options
            });
        }
    }

    render(): React.ReactNode {
        const classNames = ['theia-source-breakpoint'];
        return <div className={classNames.join(' ')}>
            {this.doRender()}
        </div>;
    }

    doRender(): React.ReactNode {
        return <React.Fragment>
            <span className='line-info' title={this.labelProvider.getLongName(this.uri)}>
                <span className='name'>{this.elementID + "-" + this.name} </span>
                <span className='path'>{this.labelProvider.getLongName(this.uri)} </span>
            </span>
        </React.Fragment>;
    }

    /*render(): React.ReactNode {
        return <React.Fragment>
            <span className='line-info' title={this.labelProvider.getLongName(this.uri)}>
                <span className='name'>{this.event} </span>
                <span className='path'>{this.labelProvider.getLongName(this.uri)} </span>
            </span>
        </React.Fragment>;
        /*return <div>
            <span className='name'>{this.element + '.' + this.event} </span>
            {' '}
            <span className='path'>{this.labelProvider.getLongName(this.uri)} </span>
        </div>;
    }*/

}
