import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import User from '../models/User';

// @desc    Search and list users
// @route   GET /api/users
// @access  Private
export const getUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const search = req.query.search as string;
    const currentUserId = req.user?._id;

    const query: any = {
      _id: { $ne: currentUserId }, // Exclude self
      isVerified: true, // Only show verified users
    };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(query)
      .select('name email phoneNumber avatar bio status lastSeen')
      .limit(30);

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Failed to search users', error: error instanceof Error ? error.message : error });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
export const updateProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, bio, avatar } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const updates: any = {};
    if (name) updates.name = name;
    if (bio !== undefined) updates.bio = bio;
    if (avatar !== undefined) updates.avatar = avatar;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    res.status(200).json({
      message: 'Profile updated successfully!',
      user: {
        id: updatedUser?._id,
        name: updatedUser?.name,
        email: updatedUser?.email,
        avatar: updatedUser?.avatar,
        bio: updatedUser?.bio,
        status: updatedUser?.status,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update profile', error: error instanceof Error ? error.message : error });
  }
};
