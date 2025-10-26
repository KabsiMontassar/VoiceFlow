/**
 * Friend Controller
 * Handles HTTP requests for friend operations
 */

import { Request, Response } from 'express';
import { FriendService } from '../services/friend.service';
import { successResponse, errorResponse } from '../utils/responses';
import logger from '../utils/logger';

export class FriendController {
  /**
   * Send friend request using friend code
   * POST /api/friends/request
   */
  static async sendRequest(req: Request, res: Response): Promise<void> {
    try {
      const { friendCode } = req.body;
      const userId = (req as any).user.userId;

      if (!friendCode) {
        res.status(400).json(errorResponse('Friend code is required', 'VALIDATION_ERROR'));
        return;
      }

      const friendRequest = await FriendService.sendFriendRequest(userId, friendCode);

      res.status(200).json(successResponse(friendRequest, 'Friend request sent successfully'));
    } catch (error: any) {
      logger.error('Send friend request error:', error);
      res.status(400).json(errorResponse(error.message || 'Failed to send friend request'));
    }
  }

  /**
   * Get pending friend requests
   * GET /api/friends/requests/pending
   */
  static async getPendingRequests(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.userId;
      const requests = await FriendService.getPendingRequests(userId);

      res.status(200).json(successResponse(requests));
    } catch (error: any) {
      logger.error('Get pending requests error:', error);
      res.status(500).json(errorResponse(error.message || 'Failed to get pending requests'));
    }
  }

  /**
   * Get sent friend requests
   * GET /api/friends/requests/sent
   */
  static async getSentRequests(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.userId;
      const requests = await FriendService.getSentRequests(userId);

      res.status(200).json(successResponse(requests));
    } catch (error: any) {
      logger.error('Get sent requests error:', error);
      res.status(500).json(errorResponse(error.message || 'Failed to get sent requests'));
    }
  }

  /**
   * Accept friend request
   * POST /api/friends/requests/:requestId/accept
   */
  static async acceptRequest(req: Request, res: Response): Promise<void> {
    try {
      const { requestId } = req.params;
      const userId = (req as any).user.userId;

      const friendRequest = await FriendService.acceptFriendRequest(requestId, userId);

      res.status(200).json(successResponse(friendRequest, 'Friend request accepted'));
    } catch (error: any) {
      logger.error('Accept friend request error:', error);
      res.status(400).json(errorResponse(error.message || 'Failed to accept friend request'));
    }
  }

  /**
   * Reject friend request
   * POST /api/friends/requests/:requestId/reject
   */
  static async rejectRequest(req: Request, res: Response): Promise<void> {
    try {
      const { requestId } = req.params;
      const userId = (req as any).user.userId;

      await FriendService.rejectFriendRequest(requestId, userId);

      res.status(200).json(successResponse(null, 'Friend request rejected'));
    } catch (error: any) {
      logger.error('Reject friend request error:', error);
      res.status(400).json(errorResponse(error.message || 'Failed to reject friend request'));
    }
  }

  /**
   * Cancel sent friend request
   * DELETE /api/friends/requests/:requestId
   */
  static async cancelRequest(req: Request, res: Response): Promise<void> {
    try {
      const { requestId } = req.params;
      const userId = (req as any).user.userId;

      await FriendService.cancelFriendRequest(requestId, userId);

      res.status(200).json(successResponse(null, 'Friend request cancelled'));
    } catch (error: any) {
      logger.error('Cancel friend request error:', error);
      res.status(400).json(errorResponse(error.message || 'Failed to cancel friend request'));
    }
  }

  /**
   * Get friends list
   * GET /api/friends
   */
  static async getFriends(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.userId;
      const friends = await FriendService.getFriends(userId);

      res.status(200).json(successResponse(friends));
    } catch (error: any) {
      logger.error('Get friends error:', error);
      res.status(500).json(errorResponse(error.message || 'Failed to get friends'));
    }
  }

  /**
   * Remove friend
   * DELETE /api/friends/:friendId
   */
  static async removeFriend(req: Request, res: Response): Promise<void> {
    try {
      const { friendId } = req.params;
      const userId = (req as any).user.userId;

      await FriendService.removeFriend(userId, friendId);

      res.status(200).json(successResponse(null, 'Friend removed successfully'));
    } catch (error: any) {
      logger.error('Remove friend error:', error);
      res.status(400).json(errorResponse(error.message || 'Failed to remove friend'));
    }
  }

  /**
   * Get friend count
   * GET /api/friends/count
   */
  static async getFriendCount(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.userId;
      const count = await FriendService.getFriendCount(userId);

      res.status(200).json(successResponse({ count }));
    } catch (error: any) {
      logger.error('Get friend count error:', error);
      res.status(500).json(errorResponse(error.message || 'Failed to get friend count'));
    }
  }

  /**
   * Check friendship status
   * GET /api/friends/check/:friendId
   */
  static async checkFriendship(req: Request, res: Response): Promise<void> {
    try {
      const { friendId } = req.params;
      const userId = (req as any).user.userId;

      const areFriends = await FriendService.areFriends(userId, friendId);

      res.status(200).json(successResponse({ areFriends }));
    } catch (error: any) {
      logger.error('Check friendship error:', error);
      res.status(500).json(errorResponse(error.message || 'Failed to check friendship'));
    }
  }
}

export default FriendController;
