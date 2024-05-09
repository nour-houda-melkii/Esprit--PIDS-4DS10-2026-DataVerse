#include "connection.h"

Connection::Connection(){}

bool Connection::createconnect()
{
db = QSqlDatabase::addDatabase("QODBC");
bool test=false;
db.setDatabaseName("projet_assurances");
db.setUserName("nour");//inserer nom de l'utilisateur
db.setPassword("nour");//inserer mot de passe de cet utilisateur

if (db.open())
test=true;
    return  test;
}

void Connection::closeConnection(){db.close();}
