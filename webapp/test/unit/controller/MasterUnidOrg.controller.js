/*global QUnit*/

sap.ui.define([
	"hr/banco_de_horas_rh/controller/MasterUnidOrg.controller"
], function (Controller) {
	"use strict";

	QUnit.module("MasterUnidOrg Controller");

	QUnit.test("I should test the MasterUnidOrg controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
