import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User.js';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, user => user.orders)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('text')
  items: string; // JSON string of items [{productId, name, price, quantity}]

  @Column('decimal', { precision: 10, scale: 2 })
  total: number;

  @Column({ enum: ['pending', 'processing', 'shipped', 'delivered'], default: 'pending' })
  status: string;

  @Column({ nullable: true })
  shippingName: string;

  @Column({ nullable: true })
  shippingEmail: string;

  @Column({ nullable: true })
  shippingPhone: string;

  @Column({ nullable: true })
  shippingStreet: string;

  @Column({ nullable: true })
  shippingCity: string;

  @Column({ nullable: true })
  shippingState: string;

  @Column({ nullable: true })
  shippingZipCode: string;

  @CreateDateColumn()
  createdAt: Date;
}
