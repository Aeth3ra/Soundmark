import { Meteor } from "meteor/meteor";
import { Tracker } from "meteor/tracker";
import { render, act, cleanup } from "@testing-library/react";
import { assert } from "chai";
import sinon from "sinon";
import { NotificationProvider } from "./NotificationProvider";
import { ConnectionStatus } from "./ConnectionStatus";

if (Meteor.isClient) {
	describe("connection status notifications", function () {
		afterEach(() => {
			cleanup();
			sinon.restore();
		});
		it("ignores initial connection and brief interruptions, but reports sustained loss and recovery once", function () {
			const clock = sinon.useFakeTimers({
				toFake: ["Date", "setTimeout", "clearTimeout"]
			});
			let connected = false;
			const dependency = new Tracker.Dependency();
			sinon.stub(Meteor, "status").callsFake(() => {
				dependency.depend();
				return { connected };
			});
			const setConnection = (value) =>
				act(() => {
					connected = value;
					dependency.changed();
					Tracker.flush();
				});
			const { queryByText, getByText, getAllByText } = render(
				<NotificationProvider>
					<ConnectionStatus />
				</NotificationProvider>
			);
			act(() => clock.tick(3000));
			assert.isNull(queryByText("Connection lost—reconnecting…"));
			setConnection(true);
			assert.isNull(queryByText("Connected."));
			setConnection(false);
			act(() => clock.tick(1000));
			setConnection(true);
			assert.isNull(queryByText("Connected."));
			setConnection(false);
			act(() => clock.tick(2000));
			assert.exists(getByText("Connection lost—reconnecting…"));
			setConnection(true);
			assert.isNull(queryByText("Connection lost—reconnecting…"));
			assert.lengthOf(getAllByText("Connected."), 1);
			setConnection(true);
			assert.lengthOf(getAllByText("Connected."), 1);
		});
	});
}
