usuarios = {
    "admin": "admin123",
    "usuario1": "pass1",
    "usuario2": "pass2"
}
        
while True:   
    usuario = input("Ingrese su nombre de usuario: ")
    contraseña = input("Ingrese su contraseña: ")
    if usuario in usuarios and usuarios[usuario] == contraseña:
        print("Acceso concedido")
        break
    else:
        print("Acceso denegado")
        
while True:
    print("1. Contar palabras")
    print("2. Encontrar número menor")
    print("3. Filtrar números pares")
    print("4. Salir")
    
    opcion = input("Seleccione una opción: ")
    
    if opcion == "1":
        # Código para contar palabras
        frase = "Si no vives para servir, no sirves para vivir"
        contador = {}
        for palabra in frase.split():
            if palabra in contador:
                contador[palabra] += 1
            else:
                contador[palabra] = 1
        print(contador)
        
    elif opcion == "2":
        # Código para encontrar número menor
        numeros = [2,4,10,15,-5,16,18]
        numero_menor = numeros[0]
        for n in numeros:
            if n < numero_menor:
                numero_menor = n
        print(numero_menor)
        
    elif opcion == "3":
        # Código para filtrar números pares
        numeros = [2,4,10,15,13,16,18]
        pares = []
        for num in numeros :
            if num % 2 == 0 :
                pares.append(num)
        print(pares)
        
    elif opcion == "4":
        print("Saliendo del programa...")
        break
        
    else:
        print("Opción no válida")

