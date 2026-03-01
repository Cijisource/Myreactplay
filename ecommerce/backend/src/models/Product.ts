import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column({ nullable: true })
  image: string;

  @Column({ nullable: true })
  category: string;

  @Column({ default: 0 })
  stock: number;

  @Column('decimal', { precision: 3, scale: 1, default: 0 })
  rating: number;

  @Column({ nullable: true })
  reviews: number;

  @CreateDateColumn()
  createdAt: Date;
}
