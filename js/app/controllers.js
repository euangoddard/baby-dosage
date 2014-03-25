(function (angular) {
    'use strict';
    
    var controllers = angular.module('dosage.controllers', ['dosage.storage']);
    
    controllers.controller('DosesController', function ($scope, $location, localstorage) {
        var baby_name = localstorage.get('baby-name');
        var medicines = localstorage.get('medicines') || [];
        if (!(baby_name && medicines.length)) {
            $location.path('/');
            return;
        }
        
        $scope.baby_name = baby_name;
        $scope.medicines = medicines;
        
        $scope.new_dose = {};
        
        $scope.set_new_dose_time_to_now = function () {
            $scope.new_dose.when = new Date();
        };
        
        // Load doses and group by medicine, removing all out of date doses and
        // grouping my medicine
        var doses = localstorage.get('doses') || [];
        doses = purge_date_out_of_date_doses(doses);
        $scope.doses = doses;
        $scope.$watch('doses', function (new_doses) {
            $scope.metrics = get_medicines_metrics(medicines, doses);
        }, true);

        // Handle the addition of new doses
        $scope.add_dose = function () {
            var dose = angular.copy($scope.new_dose);
            var dose_taken_time = Time.from_date(dose.when);
            
            var today = new Date();
            var one_day_interval = new Interval(0, 0, 0, 0, 1);
            var yesterday = one_day_interval.substract_from_date(today);
            
            var dose_taken_date;
            if (dose_taken_time < Time.now()) {
                // Dose was taken earlier today
                dose_taken_date = today;
            } else {
                // Dose must have been taken yesterday
                dose_taken_date = yesterday;
            }
            dose.when = dose_taken_time.mix_with_date(dose_taken_date);
            doses.unshift(dose);
            doses.sort(compare_doses);
            localstorage.put('doses', doses);
            $scope.new_dose = {};
        };
        
        $scope.delete_dose = function (index_to_delete) {
            doses.splice(index_to_delete, 1);
            localstorage.put('doses', doses);
        };
        
        // Metrics
        $scope.metrics = get_medicines_metrics(medicines, doses);
        
    });
    
    var Time = function (hours, minutes, seconds, milliseconds) {
        this.hours = hours;
        this.minutes = minutes;
        this.seconds = seconds;
        this.milliseconds = milliseconds;
    };
    
    Time.from_date = function (date) {
        if (!(date instanceof Date)) {
            date = Date.parse(Date);
        }
        return new Time(
            date.getHours(),
            date.getMinutes(),
            date.getSeconds(),
            date.getMilliseconds()
        );
    };
    Time.now = function () {
        return Time.from_date(new Date());
    };
    
    Time.prototype = {
        to_milliseconds: function () {
            return (
                this.milliseconds +
                this.seconds * 1000 +
                this.minutes * 1000 * 60 +
                this.hours * 1000 * 60 * 60
            );
        },
        valueOf: function () {
            // So that equality comparisons work
            return this.to_milliseconds();
        },
        is_equal_to: function (time) {
            return time.to_milliseconds() === time.to_milliseconds();
        },
        mix_with_date: function (date) {
            if (!(date instanceof Date)) {
                date = Date.parse(Date);
            }
            return new Date(
                date.getFullYear(),
                date.getMonth(),
                date.getDate(),
                this.hours,
                this.minutes,
                this.seconds,
                this.milliseconds
            );
        }
    };
    
    var Interval = function (milliseconds, seconds, minutes, hours, days) {
        this.milliseconds = milliseconds || 0;
        this.milliseconds += (seconds || 0) * 1000;
        this.milliseconds += (minutes || 0) * 60 * 1000;
        this.milliseconds += (hours || 0) * 60 * 60 * 1000;
        this.milliseconds += (days || 0) * 24 * 60 * 60 * 1000;
    };
    Interval.prototype = {
        add_to_date: function (date) {
            if (!(date instanceof Date)) {
                date = new Date(Date.parse(date));
            }
            var milliseconds = date.getTime() + this.milliseconds;
            return new Date(milliseconds);
        },
        substract_from_date: function (date) {
            if (!(date instanceof Date)) {
                date = new Date(Date.parse(date));
            }
            var milliseconds = date.getTime() - this.milliseconds;
            return new Date(milliseconds);
        },
        valueOf: function () {
            return this.milliseconds;
        }
        
    };
    
    var purge_date_out_of_date_doses = function (doses) {
        var date_now = new Date();
        var one_day_interval = new Interval(0, 0, 0, 0, 1);
        var date_24_hours_ago = one_day_interval.substract_from_date(date_now);
        
        // Ensure that the does are in order
        doses.sort(compare_doses);
        var doses_from_last_24_hours = [];
        angular.forEach(doses, function (dose) {
            if (date_24_hours_ago < new Date(Date.parse(dose.when))) {
                doses_from_last_24_hours.push(dose);
            }
        });
        return doses_from_last_24_hours;
    };
    
    var compare_doses = function (a, b) {
        return Date.parse(b.when) - Date.parse(a.when);
    };
    
    var get_medicines_metrics = function (medicines, doses) {
        // Don't consider anything outside the last 24 hours
        doses = purge_date_out_of_date_doses(doses);
        
        // Collect doses by medicine ID
        var doses_by_medicine_id = {}
        angular.forEach(doses, function (dose) {
            var medicine_id = dose.medicine;
            if ((medicine_id in doses_by_medicine_id)) {
                doses_by_medicine_id[medicine_id].push(dose);
            } else {
                doses_by_medicine_id[medicine_id] = [dose];
            }
        });
        
        // For each medicine available, get metrics:
        var medicines_metrics = [];
        angular.forEach(medicines, function (medicine) {
            var medicine_doses = doses_by_medicine_id[medicine.id] || [];
            medicines_metrics.push(
                get_medicine_metrics(medicine, medicine_doses)
            );
        });
        
        return medicines_metrics;
    };
    
    var get_medicine_metrics = function (medicine, doses) {
        // Can the medicine be taken based on elapsed time since the last dose?
        var last_dose = doses[0];
        var is_enough_time_elapsed = true;
        if (last_dose) {
            var medicine_interval = new Interval(0, 0, 0, medicine.interval);
            var now = new Date();
            is_enough_time_elapsed = (medicine_interval.add_to_date(last_dose.when) < now);
        }
        
        // Has the number of doses exceeded that in the last 24 hours
        var is_frequency_allowance_ok = doses.length < medicine.frequency;
        
        return {
            medicine: medicine,
            is_enough_time_elapsed: is_enough_time_elapsed,
            is_frequency_allowance_ok: is_frequency_allowance_ok,
            is_next_dose_ok: is_enough_time_elapsed && is_frequency_allowance_ok
        };
    };
    
    controllers.controller('MedicinesController', function ($scope, $location, localstorage) {
        var baby_name = localstorage.get('baby-name');
        if (!baby_name) {
            $location.path('/');
            return;
        }
        $scope.baby_name = baby_name;
        
        var creation_counter = localstorage.get('creation-counter') || 0;
        $scope.medicines = localstorage.get('medicines') || [];
        
        // Addition of new medicines
        $scope.new_medicine = {};
        $scope.add_medicine = function () {
            var new_medicine = angular.extend(
                {id: creation_counter},
                $scope.new_medicine
            );
            $scope.medicines.push(new_medicine);
            localstorage.put('medicines', $scope.medicines);
            $scope.new_medicine = {};
            creation_counter += 1;
            localstorage.put('creation-counter', creation_counter);
        };
        
        // Removal of medicines
        $scope.delete_medicine = function (medicine_to_delete_id) {
            var updated_medicines = [];
            angular.forEach($scope.medicines, function (medicine) {
                if (medicine.id !== medicine_to_delete_id) {
                    updated_medicines.push(medicine);
                }
            });
            $scope.medicines = updated_medicines;
            localstorage.put('medicines', updated_medicines);
        };
    });
    controllers.controller('TermsController', function ($scope) {
        
    });
    
    controllers.controller('GettingStartedController', function ($scope, localstorage) {
        $scope.baby_name = localstorage.get('baby-name');
        $scope.$watch('baby_name', function (new_name, old_name) {
            if (new_name !== old_name) {
                localstorage.put('baby-name', new_name);
            }
        });
    });
    
    
    
    controllers.controller('MenuController', function ($scope) {
        $scope.is_menu_open = false;
    });
    
})(window.angular);