price_1 = 0.50
price_2 = 1.00
stay_hours = 5
limit = 3

extra_hours = stay_hours - limit

if stay_hours > limit :
    total_extra = (limit * price_1) + (extra_hours * price_2)
    print(f'The total to pay is: {total_extra:.2f}')
else:
    total = stay_hours * price_1
    print(f'The total to pay is: {total:.2f}')