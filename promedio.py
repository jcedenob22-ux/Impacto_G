grade_1 = float(input('Enter the first grade: '))
grade_2 = float(input('Enter the second grade: '))
grade_3 = float(input('Enter the third grade: '))
average = (grade_1 + grade_2 + grade_3) / 3

if average >= 7:
    print('Passed')
elif average >= 5 and average <= 6.9:
    print('Supplementary')
elif average < 5 and average >= 4:
    print('Failed')
else:
    print('Alert')