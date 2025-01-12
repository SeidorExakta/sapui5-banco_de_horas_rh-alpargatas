sap.ui.define([
    "./BaseController",
    "sap/m/MessageToast",
    "sap/ui/core/format/DateFormat",
    "sap/m/PDFViewer",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/ButtonType",
    "sap/ui/model/json/JSONModel",
], function (BaseController, MessageToast, DateFormat, PDFViewer, Dialog, Button, ButtonType, JSONModel) {
    "use strict";

    // var sServiceUrl = ("/sap/opu/odata/sap/ZHRTIME_MANAGER_BH_SRV/");
    // var oOData = new sap.ui.model.odata.ODataModel(sServiceUrl, true);
    var oOData;
    var gPernr = "";
    var gOrgeh = "";

    function addDate(dt, amount, dateType) {
        switch (dateType) {
            case 'days':
                return dt.setDate(dt.getDate() + amount) && dt;
            case 'weeks':
                return dt.setDate(dt.getDate() + (7 * amount)) && dt;
            case 'months':
                return dt.setMonth(dt.getMonth() + amount) && dt;
            case 'years':
                return dt.setFullYear(dt.getFullYear() + amount) && dt;
        }
    }

    return BaseController.extend("hr.bancodehorasgestor.controller.Detail", {

        onInit: function () {
            // Step adicional em todas as apps pra funcionar essa gambiarra de acesso ao oModel no Workzone
            oOData = this.getOwnerComponent().getModel();

            this.Busy = new sap.m.BusyDialog({ busyIndicatorDelay: 0 });
            this.Busy.open();
            this.setInitDate();
            this.getRouter().getRoute("Detail").attachMatched(this._onRoute, this);
            this.Busy.close();
        },

        _onRoute: function (evt) {
            gPernr = evt.getParameters().arguments.pernr;
            gOrgeh = evt.getParameters().arguments.orgeh;
            this.loadHeader(gPernr);
            this.utilLoadEntity(gPernr);
        },

        loadHeader: function (matricula) {
            var that = this;

            // Não funciona mais. Filters e Expand são enviados como parâmetro no urlParameters
            // var sURL = "/headerSet/?$filter=pernr eq '" + matricula + "'";
            var sURL = "/headerSet";
            var value = sURL;
            var oJson = new sap.ui.model.json.JSONModel();
            oOData.read(value, {
                urlParameters: {
                    "$filter": `pernr eq '${matricula}'`
                },
                success: function (oSuccess) {
                    if (oSuccess) {
                        oJson.setData(oSuccess);
                        that.getView().setModel(oJson, "header");
                    }
                },
                error: function (oError) {
                    console.log("Erro de odata");
                }
            });
        },

        utilLoadEntity: function (pPernr, pPeriodo) {
        //utilLoadEntity: function (pPernr, pBegda, pEndda) {
            var that = this;

            /*
            var vBegda;
            var vEndda;
            var today;
            var parts;
            var vPernr = pPernr;
            if (!pBegda) {
                today = new Date();
                vBegda = new Date(today.getFullYear(), today.getMonth(), 1); //Retorna data com primeiro dia do mês atual
                vBegda = this.formatToDate(vBegda); //Retorna data com primeiro dia do mes formatada ex: "2020-11-01T00:00:00"
            }
            else {
                vBegda = pBegda;
            }

            if (!pEndda) {
                today = new Date();
                today = addDate(today, -1, "days");
                vEndda = this.formatToDate(today); //Retorna data com dia de hoje formatada ex: "2020-11-10T00:00:00"
            }
            else {
                vEndda = pEndda;
            }
            var oPDFViewer = this.getView().byId("idbancohoras");
            var sURL = "/BancoHoraPDFSet(Pernr='" + vPernr + "',Begda=datetime'" + vBegda + "',Endda=datetime'" + vEndda + "')/$value";

            sURL = sURL.replace(/:/g, '%3A');
            */

            if (!pPeriodo)
            {
                var today  = new Date();
                var vPeriodo = today.getFullYear() + '' + today.getMonth() + 1;
            }
            else
                vPeriodo = pPeriodo;
            
            console.log("Per", vPeriodo );

            var oPDFViewer = this.getView().byId("idbancohoras");

            var sURL = "/BHPeriodPDF(Pernr='" + pPernr + "',Period='" + vPeriodo + "')/$value";
            sURL = sURL.replace(/:/g, '%3A');

            var oModel = this.getOwnerComponent().getModel();
            var oXhr = new window.XMLHttpRequest();
            var sUrlGet = oModel.sServiceUrl + "/" + sURL;
			oXhr.open("GET", sUrlGet);

            oXhr.responseType = "blob"; // force the HTTP response, response-type header to be blob
			oXhr.onload = function () {
				var oBlob = oXhr.response;
				var sNewURL = window.URL.createObjectURL(new Blob([oBlob], {
					type: "application/pdf"
				}));
				//Publica URL
				jQuery.sap.addUrlWhitelist("blob");
				//Atualiza model com link
				that.getView().byId("idbancohoras").setSource(sNewURL);
				that.getView().byId("idbancohoras").setDisplayType("Auto");
				that.getView().byId("idbancohoras").setVisible(true);
			};
			oXhr.send();

            /*
            oOData.read(sURL, {
                success: function (oSuccess, oResponse) {
                    var vServiceUrl = sServiceUrl + sURL;
                    oPDFViewer.setSource(vServiceUrl);
                    oPDFViewer.setDisplayType("Auto");
                    oPDFViewer.setVisible(true);
                },
                error: function (Error) {
                    var message1 = "Erro ao retornar dados do banco de horas!";
                    var obj = "";
                    var message = "";
                    try {
                        if (Error.responseText) {
                            obj = JSON.parse(Error.responseText);
                            message = obj.error.message.value;
                        } else if (Error.response.body) {
                            var errorModel = new sap.ui.model.xml.XMLModel();
                            errorModel.setXML(Error.response.body);
                            if (errorModel.getProperty("/0/message") !== "") {
                                Error = errorModel.getProperty("/0/message");
                            } else {
                                message = message1;
                            }
                        } else {
                            message = message1;
                        }
                    } catch (error) {
                        message = message1;
                    }
                    MessageToast.show(message, {
                        duration: 5000,
                        animationDuration: 1000
                    });
                }
            });
            */
        },

        handleChange: function (evt) {

            let newSelectedDate = evt.getSource().getProperty("dateValue");
            var vPeriodo = `${newSelectedDate.getFullYear()}${("0" + (newSelectedDate.getMonth() + 1)).slice(-2)}`;

            console.log(vPeriodo);
            this.utilLoadEntity(gPernr, vPeriodo);

        },

        onPressBusca: function () {

            console.log(this.getView().byId("idRangeData").getFrom());

            var sBegda = this.formatToDate(this.getView().byId("idRangeData").getFrom());
            var sEndda = this.formatToDate(addDate(this.getView().byId("idRangeData").getTo(), -1, "days"));

            var sMesIni = sBegda.substr(5, 2);
            var sMesFim = sEndda.substr(5, 2);

            if (sBegda === null || sEndda === null) {
                this.openDialogToError("Data não Permitida");
            } else {
                if (sMesIni === sMesFim) {
                    this.utilLoadEntity(gPernr, sBegda, sEndda);
                }
                else {
                    this.openDialogToError("Selecionar apenas um mês no período de-até");
                }
            }
        },

        formatToDate: function (date) {
            var newDate = DateFormat.getDateTimeInstance({
                pattern: "yyyy-MM-ddT00:00:00",
                UTC: true
            }).format(date);
            return newDate;
        },

        onCloseMasterPress: function (evt) {
            var that = this;
            function sizeChanged(mParams) {
                switch (mParams.name) {
                    case "Phone":
                        that.getModel("appView").setProperty("/actionButtonsInfo/midColumn/fullScreen", false);
                        that.getModel("appView").setProperty("/layout", "OneColumn");
                        break;
                    case "Tablet":
                        that.getModel("appView").setProperty("/actionButtonsInfo/midColumn/fullScreen", false);
                        that.getModel("appView").setProperty("/layout", "OneColumn");
                        break;
                    case "Desktop":
                        var vFullSreen = that.getModel("appView").getData().layout;
                        if (vFullSreen === "TwoColumnsMidExpanded") {
                            that._setLayout("Full");
                        } else {
                            that._setLayout("Two");
                        }
                }
            }

            // Register an event handler to changes of the screen size
            // sap.ui.Device.media.attachHandler(sizeChanged, null, sap.ui.Device.media.RANGESETS.SAP_STANDARD);
            // Do some initialization work based on the current size
            sizeChanged(sap.ui.Device.media.getCurrentRange(sap.ui.Device.media.RANGESETS.SAP_STANDARD));
        },

        openDialogToError: function (text) {
            new Dialog({
                id: "IdDialogToError",
                title: "Mensagem de erro",
                type: "Message",
                state: "Error",
                content: new sap.m.Text({
                    text: text
                }),
                endButton: new Button({
                    text: "Cancelar",
                    press: function (oEvent) {
                        oEvent.getSource().getParent().close();
                    }
                }),
                afterClose: function (oEvent) {
                    oEvent.getSource().destroy();
                }
            }).open();
        },

        setInitDate: function () {

            var maxDate = new Date();
            maxDate = addDate(maxDate, -1, "days");

            var minDate = new Date("01-01-1800".replace(/(\d{2})-(\d{2})-(\d{4})/, "$2/$1/$3"));
            var firstDay = new Date(minDate);

            var y2 = maxDate.getFullYear();
            var m2 = maxDate.getMonth();
            var dateFrom = new Date(y2, m2, 1);

            var oModel = new JSONModel();
            oModel.setData({
                dateValueDRS2: dateFrom,
                secondDateValueDRS2: maxDate,
                dateMinDRS2: firstDay,
                dateMaxDRS2: maxDate
            });
            this.getView().setModel(oModel);

        }

    });

});