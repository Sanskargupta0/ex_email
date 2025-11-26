import jwt from "jsonwebtoken";

/**
 * Authentication middleware to validate JWT tokens and check for email_service tool access
 */
export const authenticateToken = (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith("Bearer ") 
      ? authHeader.substring(7) 
      : null;

    if (!token) {
      return res.status(401).json({ 
        message: "Unauthorized: No token provided" 
      });
    }

    // Verify and decode token
    const decoded = jwt.verify(token, process.env.AUTH_SECRET_KEY);

    // Check if user is active
    if (!decoded.is_active) {
      return res.status(403).json({ 
        message: "Forbidden: User account is inactive" 
      });
    }

    // Check if user is approved
    if (!decoded.approved) {
      return res.status(403).json({ 
        message: "Forbidden: User account is not approved" 
      });
    }

    // Check if user has email_service tool access
    const tools = decoded.tools || [];
    if (!tools.includes("email_service")) {
      return res.status(403).json({ 
        message: "Forbidden: You need 'email_service' tool access. Please contact an administrator." 
      });
    }

    // Attach user info to request
    req.user = {
      id: decoded.user_id,
      username: decoded.sub,
      email: decoded.email,
      is_admin: decoded.is_admin || false,
      tools: tools
    };

    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ 
        message: "Unauthorized: Invalid token" 
      });
    }
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ 
        message: "Unauthorized: Token has expired" 
      });
    }
    console.error("Authentication error:", error);
    return res.status(500).json({ 
      message: "Internal server error during authentication" 
    });
  }
};

/**
 * Middleware to check if user is admin
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ 
      message: "Forbidden: Admin privileges required" 
    });
  }
  next();
};


export const matchSecretKey = (req, res, next) => {
  const providedKey = req.headers["x-secret-key"] || req.query.secret_key;
  const validKey = process.env.SECRET_KEY ;

  if (!providedKey || providedKey !== validKey) {
    return res.status(403).json({
      message: "Forbidden: Invalid or missing secret key"
    });
  }
  next();
};