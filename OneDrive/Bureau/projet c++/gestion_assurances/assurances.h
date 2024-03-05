#ifndef ASSURANCES_H
#define ASSURANCES_H
#include <QMainWindow>
#include <QString>
#include <QSqlQuery>
#include <QSqlQueryModel>


class assurances
{
    QString  type;
    int id_assurances;
    float prix;
public:
    //constructeurs
    assurances(){};
    assurances( QString, float, int );

    //GETTERS
    QString gettype(){return type;}
    float getprix(){return prix;}
    int getid_assurances(){return id_assurances;}

    //SETTERS
    void settype(QString t){type =t ;}
    void setprix(float p){prix =p ;}
    void setid_assurances(int id ){this-> id_assurances =id ;}

    bool ajouter ();
    QSqlQueryModel * afficher();
    bool supprimer(int);


};

#endif // ASSURANCES_H
