import { User, Notification } from '../models/index.js';
import mongoose from 'mongoose';

// Follow a user
export const followUser = async (req, res) => {
    try {
        const followerId = req.user.userId || req.user.id;
        const { userId } = req.params;

        // Validate
        if (userId === followerId) {
            return res.status(400).json({ error: 'Cannot follow yourself' });
        }

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        // Check if user exists
        const targetUser = await User.findById(userId);
        if (!targetUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        const currentUser = await User.findById(followerId);

        // Check if already following
        if (currentUser.following.includes(userId)) {
            return res.status(400).json({ error: 'Already following this user' });
        }

        // Check if blocked
        const isBlocked = currentUser.blockedUsers.includes(userId) || 
                         targetUser.blockedUsers.includes(followerId);
        if (isBlocked) {
            return res.status(403).json({ error: 'Cannot follow this user' });
        }

        // Create follow relationship
        await User.findByIdAndUpdate(followerId, {
            $addToSet: { following: userId }
        });
        await User.findByIdAndUpdate(userId, {
            $addToSet: { followers: followerId }
        });

        // Create notification
        await Notification.create({
            userId,
            type: 'follow',
            message: 'started following you',
            content: 'started following you',
            fromUserId: followerId,
            isRead: false,
            isActive: true
        });

        res.json({ message: 'Successfully followed user' });
    } catch (error) {
        
        res.status(500).json({ error: 'Failed to follow user' });
    }
};

// Unfollow a user
export const unfollowUser = async (req, res) => {
    try {
        const followerId = req.user.userId || req.user.id;
        const { userId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        // Remove from both users
        const result1 = await User.findByIdAndUpdate(followerId, {
            $pull: { following: userId }
        });
        await User.findByIdAndUpdate(userId, {
            $pull: { followers: followerId }
        });

        if (!result1) {
            return res.status(404).json({ error: 'Not following this user' });
        }

        res.json({ message: 'Successfully unfollowed user' });
    } catch (error) {
        
        res.status(500).json({ error: 'Failed to unfollow user' });
    }
};

// Get user's followers
export const getFollowers = async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user.userId || req.user.id;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        const targetUser = await User.findById(userId).select('followers').lean();
        if (!targetUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        const currentUser = await User.findById(currentUserId).select('following blockedUsers').lean();

        // Get follower details
        const followers = await User.find({ _id: { $in: targetUser.followers } })
            .select('username name profileAvatar bio verified')
            .lean();

        // Enrich with status
        const enrichedFollowers = followers.map(f => ({
            id: f._id,
            username: f.username,
            name: f.name,
            avatar: f.profileAvatar,
            bio: f.bio,
            verified: f.verified || false,
            is_following: currentUser.following.some(id => id.equals(f._id)),
            is_blocked: currentUser.blockedUsers.some(id => id.equals(f._id))
        }));

        res.json({ followers: enrichedFollowers });
    } catch (error) {
        
        res.status(500).json({ error: 'Failed to get followers' });
    }
};

// Get users the user is following
export const getFollowing = async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user.userId || req.user.id;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        const targetUser = await User.findById(userId).select('following').lean();
        if (!targetUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        const currentUser = await User.findById(currentUserId).select('following blockedUsers').lean();

        // Get following details
        const following = await User.find({ _id: { $in: targetUser.following } })
            .select('username name profileAvatar bio verified')
            .lean();

        // Enrich with status
        const enrichedFollowing = following.map(f => ({
            id: f._id,
            username: f.username,
            name: f.name,
            avatar: f.profileAvatar,
            bio: f.bio,
            verified: f.verified || false,
            is_following: currentUser.following.some(id => id.equals(f._id)),
            is_blocked: currentUser.blockedUsers.some(id => id.equals(f._id))
        }));

        res.json({ following: enrichedFollowing });
    } catch (error) {
        
        res.status(500).json({ error: 'Failed to get following' });
    }
};

// Block a user
export const blockUser = async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const { targetUserId } = req.params;
        const { reason } = req.body;

        // Validate
        if (userId === targetUserId) {
            return res.status(400).json({ error: 'Cannot block yourself' });
        }

        if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        // Check if user exists
        const targetUser = await User.findById(targetUserId);
        if (!targetUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        const currentUser = await User.findById(userId);

        // Check if already blocked
        if (currentUser.blockedUsers.includes(targetUserId)) {
            return res.status(400).json({ error: 'User already blocked' });
        }

        // Block user
        await User.findByIdAndUpdate(userId, {
            $addToSet: { blockedUsers: targetUserId }
        });

        // Remove follow relationships
        await User.findByIdAndUpdate(userId, {
            $pull: { followers: targetUserId, following: targetUserId }
        });
        await User.findByIdAndUpdate(targetUserId, {
            $pull: { followers: userId, following: userId }
        });

        res.json({ message: 'User blocked successfully' });
    } catch (error) {
        
        res.status(500).json({ error: 'Failed to block user' });
    }
};

// Unblock a user
export const unblockUser = async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const { blockedUserId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(blockedUserId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        const result = await User.findByIdAndUpdate(userId, {
            $pull: { blockedUsers: blockedUserId }
        });

        if (!result) {
            return res.status(404).json({ error: 'User is not blocked' });
        }

        res.json({ message: 'User unblocked successfully' });
    } catch (error) {
        
        res.status(500).json({ error: 'Failed to unblock user' });
    }
};

// Get blocked users
export const getBlockedUsers = async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;

        const user = await User.findById(userId).select('blockedUsers').lean();
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const blockedUsers = await User.find({ _id: { $in: user.blockedUsers } })
            .select('username name profileAvatar bio')
            .lean();

        const formatted = blockedUsers.map(u => ({
            id: u._id,
            username: u.username,
            name: u.name,
            avatar: u.profileAvatar,
            bio: u.bio,
            blocked_at: new Date()
        }));

        res.json({ blocked_users: formatted });
    } catch (error) {
        
        res.status(500).json({ error: 'Failed to get blocked users' });
    }
};

// Get follow stats
export const getFollowStats = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        const user = await User.findById(userId).select('followers following').lean();
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            followers_count: user.followers?.length || 0,
            following_count: user.following?.length || 0
        });
    } catch (error) {
        
        res.status(500).json({ error: 'Failed to get follow stats' });
    }
};

// Check if following
export const checkFollowing = async (req, res) => {
    try {
        const followerId = req.user.userId || req.user.id;
        const { userId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        const user = await User.findById(followerId).select('following').lean();
        const isFollowing = user?.following.some(id => id.equals(userId)) || false;

        res.json({ is_following: isFollowing });
    } catch (error) {
        
        res.status(500).json({ error: 'Failed to check following status' });
    }
};

// Get suggested users to follow
export const getSuggestedUsers = async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const limit = parseInt(req.query.limit) || 10;

        const currentUser = await User.findById(userId)
            .select('following blockedUsers')
            .lean();

        if (!currentUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        const excludeIds = [
            userId,
            ...currentUser.following.map(id => id.toString()),
            ...currentUser.blockedUsers.map(id => id.toString())
        ];

        // Find users with mutual connections
        const usersFollowingMe = await User.find({
            following: userId,
            _id: { $nin: excludeIds }
        }).select('_id').lean();

        const friendOfFriendIds = await User.find({
            _id: { $in: currentUser.following }
        }).select('following').lean();

        const allSuggestions = new Set();
        friendOfFriendIds.forEach(user => {
            user.following.forEach(id => {
                const idStr = id.toString();
                if (!excludeIds.includes(idStr)) {
                    allSuggestions.add(idStr);
                }
            });
        });

        usersFollowingMe.forEach(user => {
            allSuggestions.add(user._id.toString());
        });

        // Get user details and calculate mutual followers
        const suggestedUsers = await User.find({
            _id: { $in: Array.from(allSuggestions) }
        })
            .select('username name profileAvatar bio verified followers')
            .lean()
            .limit(limit * 2); // Get more to filter later

        // Calculate mutual followers and enrich
        const enriched = suggestedUsers.map(user => {
            const mutualFollowers = user.followers.filter(fid =>
                currentUser.following.some(myFid => myFid.equals(fid))
            ).length;

            return {
                id: user._id,
                username: user.username,
                name: user.name,
                avatar: user.profileAvatar,
                bio: user.bio,
                verified: user.verified || false,
                followers_count: user.followers?.length || 0,
                mutual_followers: mutualFollowers
            };
        });

        // Sort by mutual followers, then by followers count
        enriched.sort((a, b) => {
            if (b.mutual_followers !== a.mutual_followers) {
                return b.mutual_followers - a.mutual_followers;
            }
            return b.followers_count - a.followers_count;
        });

        res.json({ suggested: enriched.slice(0, limit) });
    } catch (error) {
        
        res.status(500).json({ error: 'Failed to get suggested users' });
    }
};
