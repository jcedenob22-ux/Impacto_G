product_prices = [4.51, 5.41, 9.99, 8.81]
total_amount = sum(product_prices)

if total_amount > 100:
    discount = total_amount * 0.20
elif total_amount > 50:
    discount = total_amount * 0.10
else:
    discount = 0

final_price = total_amount - discount

print(f'Total before discount: {total_amount:.2f}')
print(f'Discount: {discount:.2f}')
print(f'Total after discount: {final_price:.2f}')