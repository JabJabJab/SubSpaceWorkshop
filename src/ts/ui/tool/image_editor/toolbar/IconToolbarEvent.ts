import IconToolbarEventType from './IconToolbarEventType';
import IconTool from './IconTool';
import CustomEvent from '../../../CustomEvent';

/**
 * The <i>IconToolbarEvent</i> interface. TODO: Document.
 *
 * @author Jab
 */
export default interface IconToolbarEvent extends CustomEvent {
  eventType: string;
  forced: boolean;
  tool: IconTool;
  type: IconToolbarEventType;
}
