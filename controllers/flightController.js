const Flight = require('../models/Flight');

// Search flights
exports.searchFlights = async (req, res) => {
    try {
        const {
            departureCity,
            arrivalCity,
            departureDate,
            returnDate,
            priceRange,
            airline,
            class: flightClass
        } = req.query;

        let query = {};

        if (departureCity) {
            query.departureCity = new RegExp(departureCity, 'i');
        }
        if (arrivalCity) {
            query.arrivalCity = new RegExp(arrivalCity, 'i');
        }
        if (departureDate) {
            const date = new Date(departureDate);
            query.departureTime = {
                $gte: date,
                $lt: new Date(date.setDate(date.getDate() + 1))
            };
        }
        if (priceRange) {
            const [min, max] = priceRange.split('-');
            query.price = { $gte: min, $lte: max };
        }
        if (airline) {
            query.airline = airline;
        }
        if (flightClass) {
            query.class = flightClass;
        }

        const flights = await Flight.find(query)
            .sort('departureTime')
            .limit(50);

        // Get unique airlines and price range for filters
        const airlines = await Flight.distinct('airline');
        const prices = await Flight.aggregate([
            { $group: {
                _id: null,
                min: { $min: '$price' },
                max: { $max: '$price' }
            }}
        ]);

        res.status(200).json({
            status: 'success',
            results: flights.length,
            data: {
                flights,
                filters: {
                    airlines,
                    priceRange: prices[0] || { min: 0, max: 0 }
                }
            }
        });
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
};

// Get flight stats
exports.getFlightStats = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const stats = await Flight.aggregate([
            {
                $facet: {
                    todayFlights: [
                        { $match: {
                            departureTime: { $gte: today, $lt: tomorrow }
                        }},
                        { $count: 'total' }
                    ],
                    byStatus: [
                        { $group: {
                            _id: '$status',
                            count: { $sum: 1 }
                        }}
                    ],
                    avgPriceByClass: [
                        { $group: {
                            _id: '$class',
                            avgPrice: { $avg: '$price' }
                        }}
                    ],
                    popularRoutes: [
                        { $group: {
                            _id: {
                                from: '$departureCity',
                                to: '$arrivalCity'
                            },
                            count: { $sum: 1 }
                        }},
                        { $sort: { count: -1 } },
                        { $limit: 5 }
                    ]
                }
            }
        ]);

        res.status(200).json({
            status: 'success',
            data: { stats: stats[0] }
        });
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
};

// Get flight details
exports.getFlightDetails = async (req, res) => {
    try {
        const flight = await Flight.findById(req.params.id);

        if (!flight) {
            return res.status(404).json({
                status: 'error',
                message: 'Flight not found'
            });
        }

        res.status(200).json({
            status: 'success',
            data: { flight }
        });
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
}; 