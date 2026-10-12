import { Meteor } from "meteor/meteor";
import { Accounts } from "meteor/accounts-base";
import { renderHook, act, waitFor } from "@testing-library/react";
import { assert } from "chai";
import sinon from "sinon";
import { useGuestAccount } from "./useGuestAccount";

if (Meteor.isClient) {
	describe("useGuestAccount", function () {
		let userIdStub;
		let userStub;
		let loggingInStub;
		let callLoginMethodStub;
		let meteorCallStub;

		beforeEach(function () {
			userIdStub = sinon.stub(Meteor, "userId");
			userStub = sinon.stub(Meteor, "user");
			loggingInStub = sinon.stub(Meteor, "loggingIn");
			callLoginMethodStub = sinon.stub(Accounts, "callLoginMethod");

			// Stub Meteor.call so that getUser() resolves successfully in tests
			meteorCallStub = sinon
				.stub(Meteor, "call")
				.callsFake((name, ...args) => {
					const callback = args[args.length - 1];
					if (typeof callback === "function") {
						callback(null, {});
					}
				});
		});

		afterEach(function () {
			sinon.restore();
		});

		it("triggers guest login automatically if unauthenticated", function () {
			userIdStub.returns(null);
			userStub.returns(null);
			loggingInStub.returns(false);

			renderHook(() => useGuestAccount());

			assert.isTrue(callLoginMethodStub.calledOnce);
		});

		it("returns user details and isReady=true when logged in", async function () {
			userIdStub.returns("user-123");
			userStub.returns({ profile: { name: "Guest User" } });
			loggingInStub.returns(false);

			const { result } = renderHook(() => useGuestAccount());

			assert.equal(result.current.userId, "user-123");
			assert.equal(result.current.name, "Guest User");

			await waitFor(() => {
				assert.isTrue(result.current.isReady);
			});

			assert.isFalse(callLoginMethodStub.called);
		});

		it("captures login errors if guest login fails", async function () {
			const error = new Error("Login failed");
			userIdStub.returns(null);
			userStub.returns(null);
			loggingInStub.returns(false);

			callLoginMethodStub.callsFake(({ userCallback }) => {
				userCallback(error);
			});

			const { result } = renderHook(() => useGuestAccount());

			await waitFor(() => {
				assert.equal(result.current.loginError, error);
			});
		});
	});
}
