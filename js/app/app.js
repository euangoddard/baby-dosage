(function (angular) {
    'use strict';
    
    var dosage = angular.module(
        'dosage',
        ['ngRoute', 'angularMoment', 'dosage.controllers', 'dosage.filters']
    );
    
    dosage.config(function ($routeProvider) {
        $routeProvider.when('/', {
            controller: 'GettingStartedController',
            templateUrl: 'partials/getting_started.html'
        });
        $routeProvider.when('/medicines', {
            controller: 'MedicinesController',
            templateUrl: 'partials/medicines.html'
        });
        $routeProvider.when('/doses', {
            controller: 'DosesController',
            templateUrl: 'partials/doses.html'
        });
        $routeProvider.when('/terms', {
            controller: 'TermsController',
            templateUrl: 'partials/terms.html'
        });
        $routeProvider.otherwise({redirectTo: '/'});
    });
    
    

    
})(window.angular);