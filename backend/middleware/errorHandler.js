const errorHandler = (err, req, res, next) => {
    console.error("Global Error:", err.stack);
    
    // Default error status and message
    let status = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';

    res.status(status).json({
        success: false,
        error: message,
    });
};

module.exports = errorHandler;
