/**
 * @preserve Copyright 2012 Martijn van de Rijdt & Modi Labs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define( [ 'js/FormModel', 'js/FormView', 'jquery' ], function( DataXML, FormView, $ ) {
    "use strict";

    /**
     * Class: Form
     *
     * This class provides the JavaRosa form functionality by manipulating the survey form DOM object and
     * continuously updating the data XML Document. All methods are placed inside the constructor (so privileged
     * or private) because only one instance will be created at a time.
     *
     * @param {string} formSelector  jquery selector for the form
     * @param {string} dataStr       <instance> as XML string
     * @param {?string=} dataStrToEdit <instance> as XML string that is to be edit. This may not be a complete instance (empty nodes could be missing) and may have additional nodes.
     *
     * @constructor
     */

    function Form( formSelector, dataStr, dataStrToEdit ) {
        var model, dataToEdit, form, $form, $formClone,
            loadErrors = [ ];

        this.ex = function( expr, type, selector, index ) {
            return model.evaluate( expr, type, selector, index );
        };
        this.Data = function( dataStr ) {
            return new DataXML( dataStr );
        };
        this.getDataO = function( ) {
            return model;
        };
        this.getInstanceID = function( ) {
            return model.getInstanceID( );
        };
        this.getFormO = function( ) {
            return form;
        };

        /**
         * Function: init
         *
         * Initializes the Form instance (XML data and HTML form).
         *
         */
        this.init = function( ) {
            $form = $( formSelector );
            //cloning children to keep any event handlers on 'form.jr' intact upon resetting
            $formClone = $form.clone( ).appendTo( '<original></original>' );

            model = new DataXML( dataStr );
            form = new FormView( $form, model );

            //var profiler = new Profiler('model.init()');
            model.init( );
            //profiler.report();

            if ( typeof dataStrToEdit !== 'undefined' && dataStrToEdit && dataStrToEdit.length > 0 ) {
                dataToEdit = new DataXML( dataStrToEdit );
                dataToEdit.init( );
                this.load( dataToEdit );
            }

            //profiler = new Profiler('html form.init()');
            form.init( );
            //profiler.report();

            if ( loadErrors.length > 0 ) {
                console.error( 'loadErrors: ', loadErrors );
            }

            if ( window.scrollTo ) {
                window.scrollTo( 0, 0 );
            }

            return loadErrors;
        };

        /**
         * @param {boolean=} incTempl
         * @param {boolean=} incNs
         * @param {boolean=} all
         */
        this.getDataStr = function( incTempl, incNs, all ) {
            return model.getStr( incTempl, incNs, all );
        };

        this.getRecordName = function( ) {
            return form.recordName.get( );
        };
        /**
         * @param {string} name
         */
        this.setRecordName = function( name ) {
            return form.recordName.set( name );
        };
        this.getRecordStatus = function( ) {
            return form.recordStatus.get( );
        };
        /**
         * @param {(boolean|string)=} markedFinal
         */
        this.setRecordStatus = function( markedFinal ) {
            return form.recordStatus.set( markedFinal );
        };
        /**
         * @param { boolean } status [description]
         */
        this.setEditStatus = function( status ) {
            return form.editStatus.set( status );
        };
        this.getEditStatus = function( ) {
            return form.editStatus.get( );
        };
        this.getName = function( ) {
            return $form.find( '#form-title' ).text( );
        };

        //restores html form to pre-initialized state
        //does not affect data instance!
        this.resetView = function( ) {
            //form language selector was moved outside of <form> so has to be separately removed
            $( '#form-languages' ).remove( );
            $form.replaceWith( $formClone );
        };
        /**
         * Old name
         * @deprecated
         * @type {Function}
         */
        this.resetHTML = this.resetHTML;

        /**
         * Validates the whole form and returns true or false
         * @return {boolean}
         */
        this.validateForm = function( ) {
            return form.validateAll( );
        };
        /**
         * Returns wether form has validated as true or false. Needs to be called AFTER calling validate()!
         * @return {!boolean}
         */
        this.isValid = function( ) {
            return form.isValid( );
        };

        /**
         * Function to load an (possibly incomplete) instance so that it can be edited.
         *
         * @param  {Object} instanceOfDataXML [description]
         *
         */
        this.load = function( instanceOfDataXML ) {
            var nodesToLoad, index, xmlDataType, path, value, target, $input, $target, $template, instanceID, error,
                filter = {
                    noTemplate: true,
                    noEmpty: true
                };

            nodesToLoad = instanceOfDataXML.node( null, null, filter ).get( );
            //first empty all form data nodes, to clear any default values except those inside templates
            model.node( null, null, filter ).get( ).each( function( ) {
                //something seems fishy about doing it this way instead of using node.setVal('');
                $( this ).text( '' );
            } );

            nodesToLoad.each( function( ) {
                var name = $( this ).prop( 'nodeName' );
                path = $( this ).getXPath( 'instance' );
                index = instanceOfDataXML.node( path ).get( ).index( $( this ) );
                value = $( this ).text( );

                //input is not populated in this function, so we take index 0 to get the XML data type
                $input = $form.find( '[name="' + path + '"]' ).eq( 0 );

                xmlDataType = ( $input.length > 0 ) ? form.input.getXmlType( $input ) : 'string';
                target = model.node( path, index );
                $target = target.get( );

                //if there are multiple nodes with that name and index (actually impossible)
                if ( $target.length > 1 ) {
                    console.error( 'Found multiple nodes with path: ' + path + ' and index: ' + index );
                }
                //if there is a corresponding node in the form's original instances
                else if ( $target.length === 1 ) {
                    //set the value
                    target.setVal( value, null, xmlDataType );
                }
                //if there is no corresponding data node but there is a corresponding template node (=> <repeat>)
                //this use of node(path,index,file).get() is a bit of a trick that is difficult to wrap one's head around
                else if ( model.node( path, 0, {
                    noTemplate: false
                } ).get( ).closest( '[template]' ).length > 0 ) {
                    //clone the template node 
                    //TODO add support for repeated nodes in forms that do not use template="" (not possible in formhub)
                    $template = model.node( path, 0, {
                        noTemplate: false
                    } ).get( ).closest( '[template]' );
                    //TODO: test this for nested repeats
                    //if a preceding repeat with that path was empty this repeat may not have been created yet,
                    //so we need to make sure all preceding repeats are created
                    for ( var p = 0; p < index; p++ ) {
                        model.cloneTemplate( $template.getXPath( 'instance' ), p );
                    }
                    //try setting the value again
                    target = model.node( path, index );
                    if ( target.get( ).length === 1 ) {
                        target.setVal( value, null, xmlDataType );
                    } else {
                        error = 'Error occured trying to clone template node to set the repeat value of the instance to be edited.';
                        console.error( error );
                        loadErrors.push( error );
                    }
                }
                //as an exception, missing meta nodes will be quietly added if a meta node exists at that path
                //the latter requires e.g the root node to have the correct name
                else if ( $( this ).parent( 'meta' ).length === 1 && model.node( $( this ).parent( 'meta' ).getXPath( 'instance' ), 0 ).get( ).length === 1 ) {
                    //if there is no existing meta node with that node as child
                    if ( model.node( ':first > meta > ' + name, 0 ).get( ).length === 0 ) {
                        $( this ).clone( ).appendTo( model.node( ':first > meta' ).get( ) );
                    } else {
                        error = 'Found duplicate meta node (' + name + ')!';
                        console.error( error );
                        loadErrors.push( error );
                    }
                } else {
                    error = 'Did not find form node with path: ' + path + ' and index: ' + index + ' so failed to load model.';
                    console.error( error );
                    loadErrors.push( error );
                }
            } );
            //add deprecatedID node, copy instanceID value to deprecatedID and empty deprecatedID
            instanceID = model.node( '*>meta>instanceID' );
            if ( instanceID.get( ).length !== 1 ) {
                error = 'InstanceID node in default instance error (found ' + instanceID.get( ).length + ' instanceID nodes)';
                console.error( error );
                loadErrors.push( error );
                return;
            }
            if ( model.node( '*>meta>deprecatedID' ).get( ).length !== 1 ) {
                var deprecatedIDXMLNode = $.parseXML( "<deprecatedID/>" ).documentElement;
                document.adoptNode( deprecatedIDXMLNode );
                $( deprecatedIDXMLNode ).appendTo( model.node( '*>meta' ).get( ) );
            }
            model.node( '*>meta>deprecatedID' ).setVal( instanceID.getVal( )[ 0 ], null, 'string' );
            instanceID.setVal( '', null, 'string' );
        };
    }

    return Form;

} );
