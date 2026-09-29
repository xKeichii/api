# API: instrukcja użycia

Ten dokument opisuje, co wysłać w każdym żądaniu. Możesz użyć Postmana, Insomnii, Thunder Client lub dowolnego klienta HTTP. Pełna specyfikacja OpenAPI jest w [openapi.yaml](openapi.yaml).

## Przygotowanie

Uruchom API i bazę zgodnie z głównym [README](../README.md). Lokalny adres bazowy to:

```text
http://localhost:3000/api
```

W Postmanie możesz zaimportować `openapi.yaml` przez **Import** i wybrać plik z repozytorium. Alternatywnie utwórz żądania ręcznie według przykładów niżej.

Dla żądań z JSON-em ustaw nagłówek:

| Nagłówek | Wartość |
| --- | --- |
| `Content-Type` | `application/json` |

Żądania do profilu i wylogowania wymagają tokenu otrzymanego po logowaniu:

| Nagłówek | Wartość |
| --- | --- |
| `Authorization` | `Bearer <token>` |

W Postmanie możesz ustawić go w zakładce **Authorization**, typ **Bearer Token**. Wklej sam token, bez prefiksu `Bearer`.

## Rejestracja

**Metoda i URL:** `POST http://localhost:3000/api/auth/register`

**Headers:** `Content-Type: application/json`

**Body** (raw, JSON):

```json
{
  "email": "ania@example.com",
  "password": "BezpieczneHaslo123!",
  "displayName": "Ania"
}
```

Odpowiedź `201 Created`:

```json
{
  "message": "Konto zostało utworzone.",
  "user": {
    "id": "1",
    "email": "ania@example.com",
    "displayName": "Ania",
    "bio": ""
  }
}
```

Rejestracja nie loguje automatycznie użytkownika. Zaloguj się, aby dostać token.

## Logowanie

**Metoda i URL:** `POST http://localhost:3000/api/auth/login`

**Headers:** `Content-Type: application/json`

**Body** (raw, JSON):

```json
{
  "email": "ania@example.com",
  "password": "BezpieczneHaslo123!"
}
```

Odpowiedź `200 OK`:

```json
{
  "token": "<JWT>",
  "expiresAt": "2026-09-29T15:00:00.000Z",
  "user": {
    "id": "1",
    "email": "ania@example.com",
    "displayName": "Ania",
    "bio": ""
  }
}
```

Token jest ważny przez godzinę. Skopiuj wartość `token`; będzie potrzebna w nagłówku `Authorization` kolejnych żądań.

## Pobranie profilu

**Metoda i URL:** `GET http://localhost:3000/api/auth/me`

**Headers:** `Authorization: Bearer <token>`

**Body:** brak

Odpowiedź `200 OK`:

```json
{
  "user": {
    "id": "1",
    "email": "ania@example.com",
    "displayName": "Ania",
    "bio": ""
  }
}
```

## Edycja profilu

**Metoda i URL:** `PATCH http://localhost:3000/api/auth/me`

**Headers:** `Authorization: Bearer <token>` oraz `Content-Type: application/json`

**Body** (raw, JSON):

```json
{
  "displayName": "Ania Kowalska",
  "bio": "Lubię podróże i kawę."
}
```

Możesz wysłać samo `displayName`, samo `bio` albo oba pola. E-mail jest tylko do odczytu i nie może znaleźć się w body.

Odpowiedź `200 OK` zawiera obiekt `user` z aktualnym profilem, w takim samym formacie jak odpowiedź z pobrania profilu.

## Wylogowanie

**Metoda i URL:** `POST http://localhost:3000/api/auth/logout`

**Headers:** `Authorization: Bearer <token>`

**Body:** brak

Odpowiedź `200 OK`:

```json
{
  "message": "Wylogowano pomyślnie."
}
```

Wylogowanie unieważnia sesję w bazie. Token nie będzie już działał.

## Walidacja i błędy

- E-mail musi mieć poprawny format; jest zapisywany małymi literami.
- Hasło przy rejestracji musi mieć co najmniej 8 i maksymalnie 72 bajty UTF-8. Jest przechowywane jako hash bcrypt, nigdy w postaci jawnej.
- Nazwa wyświetlana ma od 1 do 80 znaków.
- Opis profilu ma maksymalnie 280 znaków.
- Przy edycji profilu wyślij co najmniej jedno z pól `displayName` lub `bio`. Nieznane pola są odrzucane.

Najczęstsze statusy odpowiedzi: `201` — konto utworzone, `200` — sukces, `400` — niepoprawny JSON lub dane, `401` — błędne dane logowania albo brak/niepoprawny/wygasły/unieważniony token, `404` — nie znaleziono użytkownika, `409` — konto z tym e-mailem już istnieje, `500` — nieoczekiwany błąd serwera.

Błąd walidacji zawiera `error` oraz `details` z nazwą pola i komunikatem, na przykład:

```json
{
  "error": "Nieprawidłowe dane.",
  "details": [
    {
      "field": "email",
      "message": "Podaj poprawny adres e-mail."
    }
  ]
}
```