import User from "../models/user_model.js";
import Organization from "../models/organization_model.js";
import bcrypt from 'bcryptjs';
import { generateTokenandSetCookie } from "../lib/util/generateToken.js";

const signup = async (req, res) => {
    try{
        const {firstName, lastName, middleName, email, password, role} = req.body;

        //checks if email format used is valid 
        const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
        console.log("Email received:", email);
        if(!emailRegex.test(email)){
            return res.status(400).json({ error: "Invalid email format."});
        }

        // checks if email is already in database 
        const existingEmail = await User.findOne({ email: email }); 
        if(existingEmail){
            return res.status(400).json({ error: "Email is already taken."});
        }

        if(password.length < 8){
            return res.status(400).json({ error: "Password must be 8 characters long."});
        }

        //hashes password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            firstName: firstName,
            lastName: lastName,
            middleName: middleName,
            email: email,
            password: hashedPassword,
            role: role || "registered_user"
        })

        if(newUser){
            generateTokenandSetCookie(newUser._id, res);
            await newUser.save();

            res.status(201).json({
                _id: newUser._id,
                firstName: newUser.firstName,
                lastName: newUser.lastName,
                middleName: newUser.middleName,
                email: newUser.email,
                role: newUser.role,
                followingOrganization: newUser.followingOrganization,
                profilePicture: newUser.profilePicture,
                likedPost: newUser.likedPost,
                memberOrganization: newUser.memberOrganization,
                applicationForMembership: newUser.applicationForMembership,
                applicationForPosts: newUser.applicationForPosts,
                posts: newUser.posts,
            });

        }else{
            res.status(400).json({ error: "Invalid user data."});
        }

    } catch (error) {
        console.log("Error in singup controller", error.message);
        res.status(500).json({ error: "Internal Server Error."});
    }
}

const login = async (req, res) => {
    try {
        console.log("LOGGING IN");
        const {email, password} = req.body;
        const user = await User.findOne({email: email});
        console.log(user);
        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required." });
        }
        
        const isPasswordCorrect = await bcrypt.compare(password, user?.password || "");

        if(!user || !isPasswordCorrect){
            return res.status(400).json({error: "Invalid email or password."});
        }

        generateTokenandSetCookie(user._id, res);

        res.status(200).json({
            _id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            middleName: user.middleName,
            email: user.email,
            role: user.role,
            following: user.following,
            followers: user.followers,
            followingOrganization: user.followingOrganization,
            profilePicture: user.profilePicture,
        });

    } catch (error) {
        console.log("Error in login controller", error.message);
        res.status(500).json({ error: "Internal Server Error."});
    }
}

const organizationSignup = async (req, res) => {
    try {
        const { name, description, website, email, password} = req.body;

        // Validate input
        if (!name || !description || !email || !password) {
            return res.status(400).json({ error: "All fields are required." });
        }

        // Validate admin email format
        const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: "Invalid admin email format." });
        }

        const existingEmail = await User.findOne({ email: email }); 
        if(existingEmail){
            return res.status(400).json({ error: "Email is already taken."});
        }

        // Check if organization name already exists
        const existingOrganization = await Organization.findOne({ name });
        if (existingOrganization) {
            return res.status(400).json({ error: "Organization name is already taken." });
        }

        // Hash admin password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new organization
        const newOrganization = new Organization({
            name,
            description,
            logo,
            website,
            email,
            password: hashedPassword,
            followers,
            members,
            applicants,
            posts,
            pendingPosts
        });

        await newOrganization.save();

        // Generate token for the admin
        generateTokenandSetCookie(newOrganization._id, res);

        res.status(201).json({
            _id: newOrganization._id,
            name: newOrganization.name,
            description: newOrganization.description,
            logo: newOrganization.logo,
            website: newOrganization.website,
            email: newOrganization.email,
            followers: newOrganization.followers,
            members: newOrganization.members,
            applicants: newOrganization.applicants,
            posts: newOrganization.posts,
            pendingPosts: newOrganization.pendingPosts
        });
    } catch (error) {
        console.log("Error in signupOrganization controller:", error.message);
        res.status(500).json({ error: "Internal Server Error." });
    }
};

const organizationLogin = async (req, res) => {
    try {
        console.log("LOGGING IN");
        const { email, password } = req.body;
        const organization = await Organization.findOne({ email: email });

        // Validate input
        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required." });
        }

        const isPasswordCorrect = await bcrypt.compare(password, organization?.password || "");

        if (!isPasswordCorrect || !organization) {
            return res.status(400).json({ error: "Invalid email or password." });
        }

        // Generate token
        generateTokenandSetCookie(organization._id, res);

        res.status(200).json({
            _id: organization._id,
            name: organization.name,
            email: organization.Organizationemail,
            website: organization.website,
            logo: organization.logo,
        });
    } catch (error) {
        console.log("Error in loginOrganization controller:", error.message);
        res.status(500).json({ error: "Internal Server Error." });
    }
};

const logout = async (req, res) => {
    try {
        res.cookie("jwt", "", {maxAge:0});
        res.status(200).json({message: "Logged out successfully."});
    } catch (error) {
        console.log("Error in logout", error.message);
        res.status(500).json({ error: "Internal Server Error."});
    }
}


export {
    signup,
    login,
    logout,
    organizationSignup,
    organizationLogin
};