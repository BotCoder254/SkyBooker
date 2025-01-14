const isAdmin = (req, res, next) => {
    // Check if user exists and is admin
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).render('403', {
            title: '403 - Access Denied',
            path: req.path,
            user: req.user,
            message: 'Access denied. Admin only.'
        });
    }
    next();
};

module.exports = isAdmin; 