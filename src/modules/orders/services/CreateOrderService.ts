import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Não foi encontrar Customer');
    }

    const productIds = products.map(product => {
      return { id: product.id };
    });

    const allProducts = await this.productsRepository.findAllById(productIds);

    const productToOrder = allProducts.map(product => {
      const index = products.findIndex(item => item.id === product.id);

      if (products[index].quantity > product.quantity) {
        throw new AppError(`Insuficiente produto em estoque: ${product.name}`);
      }

      return {
        product_id: product.id,
        price: product.price,
        quantity: products[index].quantity,
      };
    });

    await this.productsRepository.updateQuantity(products);
    console.log(products);

    const order = await this.ordersRepository.create({
      customer,
      products: productToOrder,
    });

    return order;
  }
}

export default CreateOrderService;
