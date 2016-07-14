import {Main} from '../../Testbed/Framework/Main';

declare function requestAnimFrame(callback: any): number;

var m_app = null;

export function start()
{
	m_app = new Main();

	loop();
}

function loop()
{
	requestAnimFrame(loop);

	m_app.SimulationLoop();
}
