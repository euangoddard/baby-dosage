(function (angular) {
    'use strict';
    
    var filters = angular.module('dosage.filters', []);
    
    filters.filter('find_medicine', function () {
        return function (medicine_id, medicines) {
            var medicine_names_by_id = {};
            angular.forEach(medicines, function (medicine) {
                medicine_names_by_id[medicine.id] = medicine.name;
            });
            return medicine_names_by_id[medicine_id] || 'unknown medicine';
        };
    });
    
    
})(window.angular);
