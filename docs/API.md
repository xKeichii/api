# API: instrukcja użycia

Ten dokument pokazuje, jak ręcznie przetestować API. Pełna specyfikacja dla narzędzi takich jak Postman i Swagger znajduje się w [openapi.yaml](openapi.yaml).

## Adres API

Lokalnie API działa pod adresem `http://localhost:3000/api`. W przykładach poniżej używany jest PowerShell w Windows. Uruchom wcześniej API i lokalną bazę zgodnie z instrukcją w głównym [README](../README.md).

```powershell
$baseUrl = "http://localhost:3000/api"
```

## 1. Rejestracja

`POST /auth/register`

```powershell
$registerBody = @{
  email = "ania@example.com"
  password = "BezpieczneHaslo123!"
  displayName = "Ania"
} | ConvertTo-Json

Invoke-RestMethod -Method Post `
  -Uri "$baseUrl/auth/register" `
  -ContentType "application/json" `
  -Body $registerBody
```

Odpowiedź `201 Created` zawiera nowy profil użytkownika. Rejestracja nie loguje automatycznie, dlatego następnie wyślij żądanie logowania.

## 2. Logowanie

`POST /auth/login`

```powershell
$loginBody = @{
  email = "ania@example.com"
  password = "BezpieczneHaslo123!"
} | ConvertTo-Json

$login = Invoke-RestMethod -Method Post `
  -Uri "$baseUrl/auth/login" `
  -ContentType "application/json" `
  -Body $loginBody

$token = $login.token
$login
```

Odpowiedź zawiera token JWT, termin jego ważności (`expiresAt`) oraz profil. Token jest ważny przez godzinę. Kolejne przykłady używają zmiennej `$token`.

## 3. Pobranie profilu

`GET /auth/me`

```powershell
Invoke-RestMethod -Method Get `
  -Uri "$baseUrl/auth/me" `
  -Headers @{ Authorization = "Bearer $token" }
```

Profil zawiera `id`, `email`, `displayName` i `bio`.

## 4. Edycja profilu

`PATCH /auth/me`

Możesz zmienić nazwę wyświetlaną, krótki opis albo oba pola. E-mail jest tylko do odczytu.

```powershell
$profileBody = @{
  displayName = "Ania Kowalska"
  bio = "Lubię podróże i kawę."
} | ConvertTo-Json

Invoke-RestMethod -Method Patch `
  -Uri "$baseUrl/auth/me" `
  -Headers @{ Authorization = "Bearer $token" } `
  -ContentType "application/json" `
  -Body $profileBody
```

## 5. Wylogowanie

`POST /auth/logout`

```powershell
Invoke-RestMethod -Method Post `
  -Uri "$baseUrl/auth/logout" `
  -Headers @{ Authorization = "Bearer $token" }
```

Wylogowanie unieważnia bieżącą sesję w bazie. Ten token nie będzie już działał; zaloguj się ponownie, aby uzyskać nowy.

## Walidacja i błędy

- E-mail musi mieć poprawny format; jest zapisywany małymi literami.
- Hasło przy rejestracji musi mieć co najmniej 8 i maksymalnie 72 bajty UTF-8. Jest przechowywane jako hash bcrypt, nigdy w postaci jawnej.
- Nazwa wyświetlana ma od 1 do 80 znaków.
- Opis profilu ma maksymalnie 280 znaków.
- Przy edycji profilu wyślij co najmniej jedno z pól `displayName` lub `bio`. Dodatkowe pola, w tym `email`, są odrzucane.

Najczęstsze kody odpowiedzi:

- `201` — konto utworzone.
- `200` — żądanie wykonane.
- `400` — niepoprawny JSON lub dane; odpowiedź walidacji zawiera `details` z nazwami pól i komunikatami.
- `401` — brak, niepoprawny, wygasły lub unieważniony token; przy logowaniu również nieprawidłowy e-mail lub hasło.
- `404` — nie znaleziono użytkownika.
- `409` — konto z podanym adresem e-mail już istnieje.
- `500` — nieoczekiwany błąd serwera, na przykład problem z bazą danych.

Chronione endpointy wymagają nagłówka:

```text
Authorization: Bearer <token>
```