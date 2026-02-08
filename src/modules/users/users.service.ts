import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { UsersRepository } from '@/shared/database/repositories/users.repository';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from './dto';

/**
 * UsersService - Handles user management operations
 *
 * Manages user CRUD operations with email uniqueness validation
 * Follows Single Responsibility: only user management logic
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly usersRepository: UsersRepository) {}

  /**
   * Create a new user
   *
   * @param dto - User creation data
   * @returns Created user
   */
  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    this.logger.log(`Creating user with email: ${dto.email}`);

    // Check if email already exists
    const existingUser = await this.usersRepository.findByEmail(dto.email);

    if (existingUser) {
      throw new BadRequestException(
        `User with email ${dto.email} already exists`,
      );
    }

    try {
      const user = await this.usersRepository.create({
        email: dto.email,
        name: dto.name,
      });

      this.logger.log(`User created successfully: ${user.id}`);

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    } catch (error) {
      this.logger.error(`Failed to create user: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get all users
   *
   * @returns List of users
   */
  async findAll(): Promise<UserResponseDto[]> {
    this.logger.log('Fetching all users');

    const users = await this.usersRepository.findAll();

    return users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));
  }

  /**
   * Get user by ID
   *
   * @param id - User ID
   * @returns User details
   */
  async findOne(id: string): Promise<UserResponseDto> {
    this.logger.log(`Fetching user: ${id}`);

    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Update user
   *
   * @param id - User ID
   * @param dto - User update data
   * @returns Updated user
   */
  async update(id: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    this.logger.log(`Updating user: ${id}`);

    // Check if user exists
    const existingUser = await this.usersRepository.findById(id);

    if (!existingUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // If updating email, check if new email already exists
    if (dto.email && dto.email !== existingUser.email) {
      const userWithEmail = await this.usersRepository.findByEmail(dto.email);

      if (userWithEmail) {
        throw new BadRequestException(
          `User with email ${dto.email} already exists`,
        );
      }
    }

    try {
      const user = await this.usersRepository.update(id, dto);

      this.logger.log(`User updated successfully: ${id}`);

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    } catch (error) {
      this.logger.error(`Failed to update user: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Delete user
   *
   * @param id - User ID
   */
  async remove(id: string): Promise<void> {
    this.logger.log(`Deleting user: ${id}`);

    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    try {
      await this.usersRepository.delete(id);
      this.logger.log(`User deleted successfully: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to delete user: ${error.message}`, error.stack);
      throw error;
    }
  }
}
