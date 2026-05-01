saldo = 100

while True :
    print('1. Consultar saldo')
    print('2. Depositar dinero')
    print('3. Retirar dinero')
    print('4. Salir')
    
    opcion = int(input('Seleccione un número: '))
    
    if opcion == 1 :
        print(f'Su saldo actual es:$ {saldo}')
    if opcion == 2 :
        valor_deposito = int(input('Ingrese el valor a depositar: '))
        saldo += valor_deposito
        print(f'Su nuevo saldo es: $ {saldo}')
    if opcion == 3 :
        valor_a_retirar = int(input('Ingrese el valor a retirar: '))
        if valor_a_retirar > saldo :
            print('No tiene suficiente saldo para retirar esa cantidad')
        else :
            saldo -= valor_a_retirar
            print(f'Su nuevo saldo es: $ {saldo}')
    if opcion == 4 :
        print('Gracias por usar el sistema bancario')
        break
            
        
    
        
