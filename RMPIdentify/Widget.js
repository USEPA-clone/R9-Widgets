define(['esri/graphic', 'esri/layers/FeatureLayer', 'esri/layers/GraphicsLayer', 'esri/tasks/RelationshipQuery', 'dojo/dom-construct',
    'esri/tasks/query', 'esri/symbols/PictureMarkerSymbol', 'esri/symbols/SimpleLineSymbol',
    'esri/Color', 'esri/dijit/util/busyIndicator', 'esri/geometry/Extent', 'dojox/grid/DataGrid',
    'dojo/data/ItemFileWriteStore', 'dijit/tree/ForestStoreModel', 'dijit/Tree', 'dojo/on', 'jimu/dijit/LoadingShelter',
    'dojo/_base/declare', 'dojo/_base/array', 'jimu/LayerInfos/LayerInfos', 'jimu/BaseWidget', 'dojo/number', 'dojo/date/stamp', 'dijit/Dialog'],
  function (Graphic, FeatureLayer, GraphicsLayer, RelationshipQuery, domConstruct,
            Query, PictureMarkerSymbol, SimpleLineSymbol,
            Color, busyIndicator, Extent, DataGrid,
            ItemFileWriteStore, ForestStoreModel, Tree, on, LoadingShelter,
            declare, array, LayerInfos, BaseWidget, number, stamp, Dialog) {

    //To create a widget, you need to derive from BaseWidget.
    return declare([BaseWidget], {

      // Custom widget code goes here

      baseClass: 'rmp-identify',
      // this property is set by the framework when widget is loaded.
      // name: 'RMPIdentify',
      // add additional properties here

      //methods to communication with app container:
      postCreate: function () {


        this.inherited(arguments);
        console.log('RMPIdentify::postCreate');
      },
      featureLayers: [],
      graphicLayer: undefined,
      startup: function () {
        var configs = this.config.layers,
          mapIdNode = this.mapIdNode,
          that = this, symbol = new PictureMarkerSymbol(
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAsAAAAUCAYAAABbLMdoAAAAAXNSR0IB2cksfwAAAAlwSFlzAAAOxAAADsQBlSsOGwAAAdtJREFUKJGV0k9Ik3Ecx/H3nn71iASyp12cE4KxUxaIPM9kzG0wUBSkf3jaoKgovChdwg6dOghCh6JLEHlZl3BpMHFrPj4oKKQM8fDAXORh2HaRnaL4wWwdBtY2V/S9fb+8+MLv8/0J/qNE8yCbRanVeDM8zO1/YuDl6iq3Nja6l0Kh8lJbnMuhra1x3+mEg4Pya6A9LpVIKgpnJidhbo4Lpqk+jUblkxa8uYmeThOJx6GrC0ZGYHdXPtrZYVbX+d6Ai0Xe9faCz1fvDQMsi3NHR7wFrp/g9XXtTipVuTg1BQ5HHXd0wNgYpNNc3d7GZxh8Ftksyv5+5fnAAHg8jbH094Nl4SgW1STIK0II9WGhIM9PT7dmKAREIrC4KC9vbeEVnZ3yldvNrG1ztnlzrQa5HPT1UQoE+CL8fr6Zpvosk5Ezug6a9hvn83B4CKOjxE8eGI3Kx/PzPDBNnBMTdXh8DMvLYBjqp6EhaTVE5/V230ulyslAAHp6YG8PqlV+ut3yZstRQqHy+4UF1c5k5KVYrL7V7ydhGHw99dwej7xh2+QTCRwuFz8UhbsN6fzZDA5SWFnhg2lybXxcmwmHK9W2GMDlIhYMqh/D4cqLltybB/VPI4PN81Px3+oXm5WbogYCJW8AAAAASUVORK5CYII=',
          11,
          20
          );

        this.loadingShelter = new LoadingShelter({hidden: true});
        this.loadingShelter.placeAt(that.domNode);

        this.loadingShelter.show();
        executiveSummaryDialog = new Dialog({
          title: "Executive Summary"
        });
        currentFacility = null;
        var multipleRMPs;
        loadRMPs = function(feature) {
          currentFacility = feature;
          that.loadingShelter.show();
          var attributes = feature.attributes;

          var selectedGraphic = new Graphic(feature.geometry, symbol);

          that.graphicLayer.add(selectedGraphic);

          var rmpQuery = new RelationshipQuery();
          rmpQuery.outFields = ['*'];
          rmpQuery.objectIds = [attributes.OBJECTID];
          rmpQuery.relationshipId = that.AllFacilities.relationshipId;
          that.facilities.queryRelatedFeatures(rmpQuery, function (e) {
            var features = e[attributes.OBJECTID].features;
            if (features.length === 1) {
              multipleRMPs = false;
              loadFeature(features[0])
            } else {
              multipleRMPs = true;
              mapIdNode.innerHTML = '<h3>Multiple RMPs Found for '+attributes.FacilityName+'</h3><br/><h5>Select one to continue</h5>' +
                '<div id="rmpGridDiv" style="width:100%;"></div>';
              var data = {
                identifier: 'OBJECTID',
                items: []
              };
              dojo.forEach(features, function (feature) {
                feature.attributes.CompletionCheckDate = stamp.toISOString(new Date(feature.attributes.CompletionCheckDate), {
                  selector: "date",
                  zulu: true
                });

                var attrs = dojo.mixin({}, feature.attributes);
                data.items.push(attrs);
              });

              var store = new ItemFileWriteStore({data: data});
              store.data = data;

              var grid = dijit.byId("rmpGrid");

              if (grid !== undefined) {
                grid.destroy();
              }

              // these attributes could be different for each state
              // the that.config.state object helps you identify which state you are working with
              // if (service.config.state.abbr === 'NV') {
              //   var layout = [
              //     {'name': '', 'field': 'Facility_Name', 'width': '100%'}
              //   ];
              // } else if (service.config.state.abbr === 'AZ') {
              //   var layout = [
              //     {'name': '', 'field': 'NAME', 'width': '100%'}
              //   ];
              // } else {
              //   var layout = [
              //     {'name': '', 'field': 'FacilityName', 'width': '100%'}
              //   ];
              // }
              var layout = [
                {'name': 'Name', 'field': 'FacilityName', 'width': '75%'},
                {'name': 'Completion Date', 'field': 'CompletionCheckDate', 'width': '25%'}
              ];
              grid = new DataGrid({
                id: 'rmpGrid',
                store: store,
                structure: layout,
                //rowSelector: '20px',
                autoHeight: true,
                sortInfo: '-2'
              });

              grid.placeAt("rmpGridDiv");

              grid.on('RowClick', function (e) {
                var rowItem = grid.getItem(e.rowIndex);
                var facility = array.filter(features, function (feature) {
                  return feature.attributes.OBJECTID === rowItem.OBJECTID[0];
                });
                loadFeature(facility[0]);
              });

              grid.startup();
              that.loadingShelter.hide();
            }
          })
        }

        function loadFeature(feature) {
          that.loadingShelter.show();
          var attributes = feature.attributes;

          var selectedGraphic = new Graphic(feature.geometry, symbol);

          that.graphicLayer.add(selectedGraphic);

          mapIdNode.innerHTML = (multipleRMPs ? '<a onclick="loadRMPs(currentFacility)" style="text-decoration:underline; cursor: pointer;">< Back</a>' : '' ) +
            '<h1>' + attributes.FacilityName + '</h1><br/>' +
            '<table><tbody id="tierii_facility">' +
            '<tr><td>Address: <br/>' + attributes.FacilityStr1 + '<br/>' + (attributes.FacilityStr2 ? attributes.FacilityStr2 + '<br/>' : '') +
            attributes.FacilityCity + ', ' + attributes.FacilityState + ' ' + attributes.FacilityZipCode + '</td></tr>' +
            '<tr><td>Phone: ' + (attributes.FacilityPhoneNumber ? attributes.FacilityPhoneNumber : 'Not Reported') + '</td></tr>' +
            '<tr><td>Website: ' + (attributes.FacilityURL ? attributes.FacilityURL : 'Not Reported') + '</td></tr>' +
            '<tr><td>Email: ' + (attributes.FacilityEmailAddress ? attributes.FacilityEmailAddress : 'Not Reported') + '</td></tr>' +
            '<tr><td>Full Time Employees: ' + attributes.FTE + '</td></tr>' +
            '<tr><td>RMP Completion Date: ' + stamp.toISOString(new Date(feature.attributes.CompletionCheckDate), {
              selector: "date",
              zulu: true
            }) + '</td></tr>' +
            '<tr><td>Parent Company(s): ' + (attributes.ParentCompanyName ? attributes.ParentCompanyName : 'Not Reported') + (attributes.Company2Name ? ', ' + attributes.Company2Name : '') + '</td></tr>' +
            '<tr><td><a onclick="executiveSummaryDialog.show();" style="text-decoration: underline; cursor: pointer;">View Executive Summary</a></td></tr>' +
            '<tr><td><h3 style="text-decoration: underline;">Contacts</h3></td></tr>' +
            '<tr><td></td><td></td></tr>' +
            '<tr><td><h5>Operator</h5></td></tr>' +
            '<tr><td>Name: ' + attributes.OperatorName + '</td></tr>' +
            '<tr><td>Phone: ' + attributes.OperatorPhone + '</td></tr>' +
            '<tr><td><h5>Emergency Contact</h5></td></tr>' +
            '<tr><td>Name: ' + attributes.EmergencyContactName + '</td></tr>' +
            '<tr><td>Title: ' + attributes.EmergencyContactTitle + '</td></tr>' +
            '<tr><td>Phone: ' + attributes.EmergencyContactPhone + (attributes.EmergencyContactExt_PIN ? ' x' + attributes.EmergencyContactExt_PIN : '') + '</td></tr>' +
            '<tr><td>24 HR Phone: ' + attributes.Phone24 + '</td></tr>' +
            '<tr><td></td></tr>' +
            '</tbody></table>' +
            '<table><tbody id="tierii_contacts"></tbody></table>' +
            '<h3 style="text-decoration: underline;">Processes</h3>' +
            '<div style="width:100%" id="processes"></div></br>'+
            '<h3 style="text-decoration: underline;">Accidents</h3>' +
            '<div style="width:100%" id="accidents"></div></br>'+
            '<h3 style="text-decoration: underline;">Emergency Reponse Plan</h3>' +
            '<div style="width:100%" id="emergency_plan"></div>';

          // get executive summary for dialog box
          var executiveSummaryQuery = new RelationshipQuery();
          executiveSummaryQuery.outFields = ['*'];
          executiveSummaryQuery.relationshipId = that.ExecutiveSummaries .relationshipId;
          executiveSummaryQuery.objectIds = [attributes.OBJECTID];

          that.AllFacilities.queryRelatedFeatures(executiveSummaryQuery, function (e) {
            var summary = '';
            var summary_parts = e[attributes.OBJECTID].features.sort(function (obj1, obj2) { return obj1.attributes.ESSeqNum - obj2.attributes.ESSeqNum});
            dojo.forEach(summary_parts, function (summary_part) {
              summary += summary_part.attributes.SummaryText.replace(/(?:\r\n|\r|\n)/g, '<br />');
            });
            executiveSummaryDialog.set("content", summary);
          });

          var processQuery = new RelationshipQuery();
          processQuery.outFields = ['*'];
          processQuery.relationshipId = that.tblS1Processes.relationshipId;
          processQuery.objectIds = [attributes.OBJECTID];

          that.AllFacilities.queryRelatedFeatures(processQuery, function (featureSet) {
            dojo.forEach(featureSet[attributes.OBJECTID].features, function (process) {
              var row = domConstruct.toDom('' +
                '<div style="padding-top:10px;"><b>Name: ' + (process.attributes.AltID ? process.attributes.AltID : 'not reported') + '</b></div>' +
                '<div>Description(s): <span id="process_' + process.attributes.ProcessID + '_naics"></span></div>' +
                '<div>Program Level: ' + process.attributes.ProgramLevel + '</span></div>' +
                '<table><tbody id="process_' + process.attributes.ProcessID + '"><tr><th colspan="2">Chemical</th><th>Quantity (lbs)</th></tr></tbody></table>');
              domConstruct.place(row, "processes");

              var naicsQuery = new RelationshipQuery();
              naicsQuery.outFields = ['*'];
              naicsQuery.relationshipId = that.tblS1Process_NAICS.relationshipId;
              naicsQuery.objectIds = [process.attributes.OBJECTID];

              that.tblS1Processes.queryRelatedFeatures(naicsQuery, function (naicsCodes) {
                var s = [];
                dojo.forEach(naicsCodes[process.attributes.OBJECTID].features, function (naics, i) {
                  s.push(that.tblS1Process_NAICS.getDomain('NAICSCode').getName(naics.attributes.NAICSCode));

                });
                var row = domConstruct.toDom(s.join(','));
                domConstruct.place(row, 'process_' + process.attributes.ProcessID + '_naics');
              });


              var processChemicalsQuery = new RelationshipQuery();
              processChemicalsQuery.outFields = ['*'];
              processChemicalsQuery.relationshipId = that.tblS1ProcessChemicals.relationshipId;
              processChemicalsQuery.objectIds = [process.attributes.OBJECTID];

              that.tblS1Processes.queryRelatedFeatures(processChemicalsQuery, function (e) {
                dojo.forEach(e[process.attributes.OBJECTID].features, function (processChemical) {

                  var chemicalQuery = new RelationshipQuery();
                  chemicalQuery.outFields = ['*'];
                  chemicalQuery.relationshipId = that.tlkpChemicals.relationshipId;
                  chemicalQuery.objectIds = [processChemical.attributes.OBJECTID];

                  that.tblS1ProcessChemicals.queryRelatedFeatures(chemicalQuery, function (e) {
                    dojo.forEach(e[processChemical.attributes.OBJECTID].features, function (chemical) {
                      if (chemical.attributes.CASNumber === '00-11-11') {
                        var flammableMixtureQuery = new RelationshipQuery();
                        flammableMixtureQuery.outFields = ['*'];
                        flammableMixtureQuery.relationshipId = that.tblS1FlammableMixtureChemicals.relationshipId;
                        flammableMixtureQuery.objectIds = [processChemical.attributes.OBJECTID];

                        that.tblS1ProcessChemicals.queryRelatedFeatures(flammableMixtureQuery, function (e) {
                          var chemicalOBJECTIDS = [];
                          dojo.forEach(e[processChemical.attributes.OBJECTID].features, function (item) {
                            chemicalOBJECTIDS.push(item.attributes.OBJECTID)
                          });

                          var chemicalLookup = new RelationshipQuery();
                          chemicalLookup.outFields = ['*'];
                          chemicalLookup.relationshipId = that.FlammableChemicals.relationshipId;
                          chemicalLookup.objectIds = chemicalOBJECTIDS;

                          that.tblS1FlammableMixtureChemicals.queryRelatedFeatures(chemicalLookup, function (e) {
                            var row_string = '<tr><td colspan="2">' + chemical.attributes.ChemicalName + '</td><td class="quantity">' + number.format(processChemical.attributes.Quantity) + '</td></tr>';
                            dojo.forEach(chemicalOBJECTIDS, function (objectid) {
                              dojo.forEach(e[objectid].features, function (mixtureChemical) {
                                row_string += '<tr><td>&#187;</td><td>' + mixtureChemical.attributes.ChemicalName + '</td><td></td></tr>';

                              })
                            });
                            var row = domConstruct.toDom(row_string);
                            domConstruct.place(row, "process_" + process.attributes.ProcessID);
                          })
                        })
                      } else {
                        var row = domConstruct.toDom('<tr><td colspan="2">' + chemical.attributes.ChemicalName + '</td><td class="quantity">' + number.format(processChemical.attributes.Quantity) + '</td></tr>');
                        domConstruct.place(row, "process_" + process.attributes.ProcessID);
                      }
                    });
                  });
                });
              });
            });
            that.loadingShelter.hide();

          });

          var accidentQuery = new RelationshipQuery();
          accidentQuery.outFields = ['*'];
          accidentQuery.relationshipId = that.tblS6AccidentHistory.relationshipId;
          accidentQuery.objectIds = [attributes.OBJECTID];

          that.AllFacilities.queryRelatedFeatures(accidentQuery, function (featureSet) {
            if (featureSet.hasOwnProperty('features')) {
              dojo.forEach(featureSet[attributes.OBJECTID].features, function (accident) {
                var release_event = [];
                accident.attributes.RE_Gas ? release_event.push('Gas') : null;
                accident.attributes.RE_Spill ? release_event.push('Spill') : null;
                accident.attributes.RE_Fire ? release_event.push('Fire') : null;
                accident.attributes.RE_Explosion ? release_event.push('Explosion') : null;
                accident.attributes.RE_ReactiveIncident ? release_event.push('Reactive Incident') : null;

                var release_source = [];
                accident.attributes.RS_StorageVessel ? release_source.push('Storage Vessel') : null;
                accident.attributes.RS_Piping ? release_source.push('Piping') : null;
                accident.attributes.RS_ProcessVessel ? release_source.push('Process Vessel') : null;
                accident.attributes.RS_TransferHose ? release_source.push('Transfer Hose') : null;
                accident.attributes.RS_Valve ? release_source.push('Valve') : null;
                accident.attributes.RS_Pump ? release_source.push('Pump') : null;
                accident.attributes.RS_Joint ? release_source.push('Joint') : null;
                accident.attributes.OtherReleaseSource ? release_source.push('Other') : null;

                var row = domConstruct.toDom('' +
                  '<div style="padding-top:10px;"><b>Date: ' + stamp.toISOString(new Date(accident.attributes.AccidentDate), {
                    selector: "date",
                    zulu: true
                  }) + '</b></div>' +
                  '<div>Duration (HHH:MM): ' + accident.attributes.AccidentReleaseDuration.substring(0, 3) + ':' + accident.attributes.AccidentReleaseDuration.substring(3, 5) + '</div>' +
                  '<div>Release Event(s): ' + release_event.join(',') + '</span></div>' +
                  '<div>Release Source(s): ' + release_source.join(',') + '</span></div>' +
                  '<table><tbody id="accident_' + accident.attributes.AccidentHistoryID + '"><tr><th colspan="2">Chemical(s)</th><th>Quantity (lbs)</th></tr></tbody></table>');
                domConstruct.place(row, "accidents");

                var accidentChemicalQuery = new RelationshipQuery();
                accidentChemicalQuery.outFields = ['*'];
                accidentChemicalQuery.relationshipId = that.AccidentChemicals.relationshipId;
                accidentChemicalQuery.objectIds = [accident.attributes.OBJECTID];

                that.tblS6AccidentHistory.queryRelatedFeatures(accidentChemicalQuery, function (e) {
                  dojo.forEach(e[accident.attributes.OBJECTID].features, function (accidentChemical) {

                    var chemicalQuery = new RelationshipQuery();
                    chemicalQuery.outFields = ['*'];
                    chemicalQuery.relationshipId = that.tblS6AccidentChemicals.relationshipId;
                    chemicalQuery.objectIds = [accidentChemical.attributes.OBJECTID];

                    that.tblS6AccidentChemicals.queryRelatedFeatures(chemicalQuery, function (e) {
                      dojo.forEach(e[accidentChemical.attributes.OBJECTID].features, function (chemical) {
                        if (chemical.attributes.CASNumber === '00-11-11') {
                          var flammableMixtureQuery = new RelationshipQuery();
                          flammableMixtureQuery.outFields = ['*'];
                          flammableMixtureQuery.relationshipId = that.tblS6FlammableMixtureChemicals.relationshipId;
                          flammableMixtureQuery.objectIds = [accidentChemical.attributes.OBJECTID];

                          that.tblS6AccidentChemicals.queryRelatedFeatures(flammableMixtureQuery, function (e) {
                            var chemicalOBJECTIDS = [];
                            dojo.forEach(e[accidentChemical.attributes.OBJECTID].features, function (item) {
                              chemicalOBJECTIDS.push(item.attributes.OBJECTID)
                            });

                            var chemicalLookup = new RelationshipQuery();
                            chemicalLookup.outFields = ['*'];
                            chemicalLookup.relationshipId = that.AccidentFlamMixChem.relationshipId;
                            chemicalLookup.objectIds = chemicalOBJECTIDS;

                            that.tblS6FlammableMixtureChemicals.queryRelatedFeatures(chemicalLookup, function (e) {
                              var row_string = '<tr><td colspan="2">' + chemical.attributes.ChemicalName + '</td><td class="quantity">' + number.format(accidentChemical.attributes.QuantityReleased) + '</td></tr>';
                              dojo.forEach(chemicalOBJECTIDS, function (objectid) {
                                dojo.forEach(e[objectid].features, function (mixtureChemical) {
                                  row_string += '<tr><td>&#187;</td><td>' + mixtureChemical.attributes.ChemicalName + '</td><td></td></tr>';

                                })
                              });
                              var row = domConstruct.toDom(row_string);
                              domConstruct.place(row, "accident_" + accident.attributes.AccidentHistoryID);
                            });
                          });
                        } else {
                          var row = domConstruct.toDom('<tr><td colspan="2">' + chemical.attributes.ChemicalName + '</td><td class="quantity">' + number.format(accidentChemical.attributes.QuantityReleased) + '</td></tr>');
                          domConstruct.place(row, "accident_" + accident.attributes.AccidentHistoryID);
                        }
                      });
                    });
                  });
                });
              })
            } else {
              domConstruct.place(domConstruct.toDom('<b>Not Accidents Reported</b>'), "accidents");
            }
          });

          var ERQuery = new RelationshipQuery();
          ERQuery.outFields = ['*'];
          ERQuery.relationshipId = that.tblS9EmergencyResponses.relationshipId;
          ERQuery.objectIds = [attributes.OBJECTID];

          that.AllFacilities.queryRelatedFeatures(ERQuery, function (e) {
            var er_plans = e[attributes.OBJECTID].features[0];
            var row_string =
              '<table><tbody id="er_plan_table">' +
              '<tr><td>Is facility included in written community ER plan?</td><td>'+ (er_plans.attributes.ER_CommunityPlan ? 'Yes':'No') +'</td></tr>' +
              '<tr><td>Does facility have its own written ER plan?</td><td>'+ (er_plans.attributes.ER_FacilityPlan ? 'Yes':'No') +'</td></tr>' +
              '<tr><td colspan="2"></td></tr>' +
              '<tr><td colspan="2"><b>Does facility\'s ER plan include ...</b></td></tr>' +
              '<tr><td class="nested">specific actions to be take in response to accidental release of regulated substance(s)?</td><td>'+(er_plans.attributes.ER_ResponseActions ? 'Yes': 'No')+'</td></tr>' +
              '<tr><td class="nested">procedures for informing the public and local agencies responding to accident releases?</td><td>'+(er_plans.attributes.ER_PublicInfoProcedures ? 'Yes': 'No')+'</td></tr>' +
              '<tr><td class="nested">information on emergency health care?</td><td>'+(er_plans.attributes.ER_EmergencyHealthCare ? 'Yes': 'No')+'</td></tr>' +
              '<tr><td></td></tr>' +
              '<tr><td colspan="2"><b>Date of most recent ...</b></td></tr>' +
              '<tr><td class="nested">review or update of facility\'s ER plan?</td><td>'+(er_plans.attributes.ER_ReviewDate ? stamp.toISOString(new Date(er_plans.attributes.ER_ReviewDate), {
                  selector: "date",
                  zulu: true
                }) : 'Not Reported')+'</td></tr>' +
              '<tr><td class="nested">ER training for facility\'s ER employees?</td><td>'+(er_plans.attributes.ERTrainingDate ? stamp.toISOString(new Date(er_plans.attributes.ERTrainingDate), {
                  selector: "date",
                  zulu: true
                }) : 'Not Reported')+'</td></tr>' +
              '<tr><td></td></tr>' +
              '<tr><td colspan="2"><b>Local agency with which facility\'s ER plan ore response activities are coordinated</b></td></tr>' +
              '<tr><td colspan="2">Name: '+(er_plans.attributes.CoordinatingAgencyName ? er_plans.attributes.CoordinatingAgencyName : 'Not Reported')+
              ', Number:'+(er_plans.attributes.CoordinatingAgencyPhone ? er_plans.attributes.CoordinatingAgencyPhone : 'Not Reported')+'</td></tr>' +
              '<tr><td colspan="2"></td></tr>' +
              '<tr><td colspan="2"><b>Subject to ...</b></td></tr>' +
              '<tr><td class="nested">OSHA Regulations at 29 CFR 1910.38?</td><td>'+(er_plans.attributes.FR_OSHA1910_38 ? 'Yes': 'No')+'</td></tr>' +
              '<tr><td class="nested">OSHA Regulations at 29 CFR 1910.120?</td><td>'+(er_plans.attributes.FR_OSHA1910_120 ? 'Yes': 'No')+'</td></tr>' +
              '<tr><td class="nested">Clean Water Act Regulations at 40 CFR 112?</td><td>'+(er_plans.attributes.FR_SPCC ? 'Yes': 'No')+'</td></tr>' +
              '<tr><td class="nested">RCRA Regulations at 40 CFR 264, 265, and 279.52?</td><td>'+(er_plans.attributes.FR_RCRA ? 'Yes': 'No')+'</td></tr>' +
              '<tr><td class="nested">OPA 90 Regulations at 40 CFR 112, 33 CFR 154, 49 CFR 194, or 30 CFR 254?</td><td>'+(er_plans.attributes.FR_OPA90 ? 'Yes': 'No')+'</td></tr>' +
              '<tr><td class="nested">State EPCRA Rules or Laws?</td><td>'+(er_plans.attributes.FR_EPCRA ? 'Yes': 'No')+'</td></tr>' +
              '<tr><td colspan="2" style="padding-left:10px;">Other: '+ er_plans.attributes.FR_OtherRegulation +'</td></tr>' +
              '</tbody></table>';
            var row = domConstruct.toDom(row_string);
            domConstruct.place(row, 'emergency_plan');
          });
        }

        this.graphicLayer = new GraphicsLayer();
        this.map.addLayer(this.graphicLayer);

        this.service = null;

        var loadRelated = function (obj) {
          dojo.forEach(obj.relationships, function (relationship) {
            if (relationship.role === "esriRelRoleOrigin") {
              that[relationship.name] = new FeatureLayer(that.baseurl + "/" + relationship.relatedTableId);
              that[relationship.name].relationshipId = relationship.id;
              that[relationship.name].on('load', function (e) {
                if (that[relationship.name].relationships.length > 0) {
                  loadRelated(that[relationship.name]);
                }
              })
            }
          });
        };

        LayerInfos.getInstance(that.map, that.map.itemInfo).then(function (layerInfosObject) {
          var facilities = layerInfosObject.getLayerInfoById(that.config.layerId);
          that.facilities = new FeatureLayer(facilities.layerObject.url);
          that.facilities.on('load', function (e) {
            that.baseurl = that.facilities.url.substring(0, that.facilities.url.lastIndexOf('/'));
            loadRelated(that.facilities);
          });
        });

        that.clickHandler = on.pausable(this.map, "click", function (e) {
          that.loadingShelter.show();
          that.graphicLayer.clear();
          var pixelWidth = that.map.extent.getWidth() / that.map.width;
          var toleraceInMapCoords = 10 * pixelWidth;
          var clickExtent = new Extent(e.mapPoint.x - toleraceInMapCoords,
            e.mapPoint.y - toleraceInMapCoords,
            e.mapPoint.x + toleraceInMapCoords,
            e.mapPoint.y + toleraceInMapCoords,
            that.map.spatialReference);

          var featureQuery = new Query();
          featureQuery.outFields = ['*'];
          featureQuery.geometry = clickExtent;

          that.facilities.queryFeatures(featureQuery, function (featureSet) {
            if (featureSet.features.length === 1) {
              loadRMPs(featureSet.features[0]);
              // noneFound.push(false);
            } else if (featureSet.features.length > 1) {
              mapIdNode.innerHTML = '<h3>Multiple Facilities at that location</h3><br/><h5>Select one to continue</h5>' +
                '<div id="gridDiv" style="width:100%;"></div>';
              var data = {
                identifier: 'OBJECTID',
                items: []
              };
              dojo.forEach(featureSet.features, function (feature) {
                var attrs = dojo.mixin({}, feature.attributes);
                data.items.push(attrs);
              });

              var store = new ItemFileWriteStore({data: data});
              store.data = data;

              var grid = dijit.byId("grid");

              if (grid !== undefined) {
                grid.destroy();
              }

              var layout = [
                {'name': 'Name', 'field': 'FacilityName', 'width': '100%'}
              ];
              grid = new DataGrid({
                id: 'grid',
                store: store,
                structure: layout,
                //rowSelector: '20px',
                autoHeight: true
              });

              grid.placeAt("gridDiv");

              grid.on('RowClick', function (e) {
                var rowItem = grid.getItem(e.rowIndex);
                var facility = array.filter(featureSet.features, function (feature) {
                  return feature.attributes.OBJECTID === rowItem.OBJECTID[0];
                });
                loadRMPs(facility[0]);
              });

              grid.startup();
              that.loadingShelter.hide();
              // noneFound.push(false);
            } else {
              mapIdNode.innerHTML = '<h3>No facilities found at this location</h3><br/>';
              that.loadingShelter.hide();
            }
          });

        });

        console.log('startup');
      },

      onOpen: function () {
        this.loadingShelter.show();
        console.log('RMPIdentify::onOpen');
        this.map.setInfoWindowOnClick(false);
        var that = this;
        if (that.clickHandler !== undefined) {
          that.clickHandler.resume();
        }

        this.mapIdNode.innerHTML = '<h1>RMP Indentify</h1><br/>' +
          '<table><tbody id="rmp_status"></tbody></table>' +
          '<br/>Click Facility to view information.';


        that.loadingShelter.hide();
      },

      onClose: function () {
        console.log('RMPIdentify::onClose');

        // clean up on close
        this.clickHandler.pause();
        this.graphicLayer.clear();
        this.map.setInfoWindowOnClick(true);
      }

    });

  });
