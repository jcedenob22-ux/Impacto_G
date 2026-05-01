numeros = [2,4,10,15,-5,16,18]
numero_menor = numeros[0]
for n in numeros:
    if n < numero_menor:
        numero_menor = n
print(numero_menor)