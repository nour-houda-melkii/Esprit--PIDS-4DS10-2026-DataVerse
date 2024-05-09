#ifndef ASSURANCES_H
#define ASSURANCES_H
#define ASSURANCES_H
#include <QSqlQuery>
#include <QString>
#include <QSqlQueryModel>
#include<QMessageBox>
#include<QSqlError>
#include <QPdfWriter>
#include <QTextDocument>
#include <QTextCursor>
#include <QSqlRecord>
#include <QStandardPaths>
#include <QPrinter>
#include <QMap>
#include <QString>
#include <QDateTime>
#include <QFile>
#include <QTextStream>
#include <QList>
#include <QMap>


class assurances
{
private:
    int id_assurances;
    QString type_assurances;
    int prix_assurances;
    QString old_type_assurances;


public:

    assurances(){};
    assurances(int, QString, int);

    int getid_assurances(){return id_assurances;}
    QString gettype_assurances_(){return type_assurances;}
   int getprix_assurances(){return prix_assurances;}


    void set_id_assurances(int i){this->id_assurances=i;}
    void set_type_assurances( QString t){type_assurances=t;}
    void set_prix_assurances( int p){prix_assurances=p;}
    QMap<QString, double> getStatsBytypePercentage();
    bool ajouter();
    QSqlQueryModel *afficher();
    bool supprimer(int);
    bool modifier(int,QString,int);
    bool checkIfIdExists(int id_assurances);
    bool supprimer_all();
    assurances getEventById(int id_assurances);
    QSqlQueryModel* trierParId();
QSqlQueryModel *rechercherParId(int id);
 bool controleprix();
  bool on_word_clicked();
   QSqlQueryModel* afficherParType(QString type);






};


#endif // ASSURANCES_H
