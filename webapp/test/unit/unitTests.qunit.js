/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"hr/banco_de_horas_rh/test/unit/AllTests"
	], function () {
		QUnit.start();
	});
});
