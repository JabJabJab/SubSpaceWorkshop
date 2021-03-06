import Project from '../Project';
import TileCache from '../../util/map/TileCache';
import Edit from '../edits/Edit';
import MapMouseEvent from '../../common/MapMouseEvent';

/**
 * The <i>Tool</i> abstract class. TODO: Document.
 *
 * @author Jab
 */
export default abstract class Tool {
  isSelector: boolean = false;
  protected readonly tileCache: TileCache = new TileCache();
  protected last: { x: number, y: number, tileX: number, tileY: number };
  protected down: { x: number, y: number, tileX: number, tileY: number };

  start(project: Project, event: MapMouseEvent): Edit[] {
    const edits = this.onStart(project, event);
    this.last = {
      x: event.data.x,
      y: event.data.y,
      tileX: event.data.tileX,
      tileY: event.data.tileY
    };
    this.down = this.last;
    return edits;
  }

  drag(project: Project, event: MapMouseEvent): Edit[] {
    const edits = this.onDrag(project, event);
    this.last = {
      x: event.data.x,
      y: event.data.y,
      tileX: event.data.tileX,
      tileY: event.data.tileY
    };
    return edits;
  }

  stop(project: Project, event: MapMouseEvent): Edit[] {
    const edits = this.onStop(project, event);
    this.last = null;
    this.down = null;
    this.tileCache.clear();
    return edits;
  }

  enter(project: Project, event: MapMouseEvent): Edit[] {
    const edits = this.onEnter(project, event);
    this.last = {
      x: event.data.x,
      y: event.data.y,
      tileX: event.data.tileX,
      tileY: event.data.tileY
    };
    return edits;
  }

  exit(project: Project, event: MapMouseEvent): Edit[] {
    const edits = this.onExit(project, event);
    this.last = {
      x: event.data.x,
      y: event.data.y,
      tileX: event.data.tileX,
      tileY: event.data.tileY
    };
    return edits;
  }

  drawCursor(container: PIXI.Container): void {
    this.onDrawCursor(container);
  }

  protected abstract onStart(project: Project, event: MapMouseEvent): Edit[];

  protected abstract onDrag(project: Project, event: MapMouseEvent): Edit[];

  protected abstract onEnter(project: Project, event: MapMouseEvent): Edit[];

  protected abstract onExit(project: Project, event: MapMouseEvent): Edit[];

  protected abstract onStop(project: Project, event: MapMouseEvent): Edit[];

  protected abstract onDrawCursor(container: PIXI.Container): void;
}
