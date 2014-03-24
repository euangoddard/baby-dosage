(function (angular) {
    'use strict';
    
    var dosage = angular.module(
        'dosage',
        ['ngRoute', 'angularMoment', 'dosage.controllers', 'dosage.filters']
    );
    
    dosage.config(function ($routeProvider) {
        $routeProvider.when('/setup', {
            controller: 'SetupController',
            templateUrl: 'partials/setup.html'
        });
        $routeProvider.when('/', {
            controller: 'DoseController',
            templateUrl: 'partials/dose.html'
        });
        $routeProvider.when('/terms', {
            controller: 'TermsController',
            templateUrl: 'partials/terms.html'
        });
        $routeProvider.otherwise({redirectTo: '/'});
    });
    
    

    
})(window.angular);