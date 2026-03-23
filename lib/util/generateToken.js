import jwt from 'jsonwebtoken';

const IS_PROD = process.env.NODE_ENV !== 'development';

export const COOKIE_OPTIONS = {
    httpOnly: true,
    sameSite: IS_PROD ? 'none' : 'lax',
    secure: IS_PROD,
    path: '/',
};

export const generateTokenandSetCookie = (userId, res) => {
    const token = jwt.sign({userId}, process.env.JWT_SECRET,{
        expiresIn: '15D'
    })

    res.cookie("jwt", token, {
        ...COOKIE_OPTIONS,
        maxAge: 15*24*60*60*1000,
    })
}