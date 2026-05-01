base_payment = 10 
plan_minutes = 60
consumption_limit = 120
extra_minute_cost = 0.25
user_consumption = 130 

# Avoid negatives
if user_consumption > plan_minutes:
    extra_minutes_used = user_consumption - plan_minutes
else:
    extra_minutes_used = 0

extra_cost = extra_minutes_used * extra_minute_cost

total_payment = base_payment + extra_cost

if user_consumption > consumption_limit:
    surcharge = total_payment * 0.15
    total_payment += surcharge

print(f'Total minutes used: {user_consumption}')
print(f'Extra minutes used: {extra_minutes_used}')
print(f'Cost for extra minutes: {extra_cost:.2f}')
print(f'Final total to pay: {total_payment:.2f}')