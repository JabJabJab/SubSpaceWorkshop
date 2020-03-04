import { LVLMap } from '../io/LVL';
import { MapRenderer } from './render/MapRenderer';
import { KeyListener } from '../util/KeyListener';
import { Session } from './Session';
import { LVZCollection } from '../io/LVZ';

export class SimpleEditor {

    activeSession: number;
    renderer: MapRenderer;

    private tabGroup: HTMLDivElement;

    sessions: Session[];

    constructor(sessions: Session[]) {

        this.sessions = sessions;

        this.tabGroup = <HTMLDivElement> document.getElementById('editor-tab-menu');

        for (let index = 0; index < sessions.length; index++) {
            let next = sessions[index];
            this.tabGroup.appendChild(next.tab);
            const _i = index;
            next.tab.addEventListener('click', (ev) => {
                this.setActiveSession(_i);
            });
        }

        // @ts-ignore
        global.editor = this;

        this.renderer = new MapRenderer();

        let container
            = <HTMLDivElement> document.getElementsByClassName("map-viewport-canvas-container").item(0);

        this.renderer.init(container, 'viewport', true);

        // Screenshot button.
        new KeyListener("F12", () => {
            let renderer = this.renderer.app.renderer;
            let renderTexture = PIXI.RenderTexture.create({width: renderer.width, height: renderer.height});
            renderer.render(this.renderer.app.stage, renderTexture);
            let canvas = renderer.extract.canvas(renderTexture);
            let b64 = canvas.toDataURL('image/png');
            let link = document.createElement("a");
            link.setAttribute("href", b64);
            link.setAttribute("download", "screenshot.png");
            link.click();
        });

        this.setActiveSession(this.sessions.length - 1);
    }

    setActiveSession(index: number) {

        this.activeSession = index;

        for (let _index = 0; _index < this.tabGroup.children.length; _index++) {
            let next = this.tabGroup.children.item(_index);
            next.classList.remove('selected');
        }

        if (index > -1) {
            this.sessions[index].tab.classList.add('selected');
        }

        if (index == -1) {
            this.renderer.setMap(null);
        } else {

            let session = this.sessions[this.activeSession];

            if (!session.loaded) {
                session.load();
            }

            let map = session.map;

            this.renderer.setMap(map);

            let lvzPackages = session.lvzPackages;

            if (lvzPackages.length !== 0) {

                let collection = new LVZCollection();

                for (let index = 0; index < lvzPackages.length; index++) {
                    let next = lvzPackages[index];
                    collection.addAll(next.collect());
                }

                this.renderer.setLvz(collection);

            } else {
                this.renderer.setLvz(null);
            }
        }
    }
}
