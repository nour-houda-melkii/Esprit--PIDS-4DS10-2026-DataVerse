#include <QPrinter>
#include "assurances.h"
#include <QDebug>
#include <QMessageBox>
#include <QTextCursor>
#include <QtCharts/QPieSeries>
#include <QtCharts/QPieSlice>
#include <QtCharts/QChart>
#include <QtCharts/QChartView>
#include <QDesktopServices>
#include <QUrl>
#include <QObject>
#include <QString>
#include "gestion_assuranes.h"
#include <QRegularExpression>



assurances::assurances(int id_assurances,QString type_assurances,int prix_assurances)
{
    this->id_assurances=id_assurances;
    this->type_assurances=type_assurances;
    this->prix_assurances=prix_assurances;


}
bool assurances::checkIfIdExists(int id_assurances)
{
    QSqlQuery query;
        query.prepare("SELECT id_assurances FROM assurances WHERE id_assurances = :id_assurances");
        query.bindValue(":id_assurances", id_assurances);

        if (query.exec() && query.next()) {
            // id exists
             QMessageBox::warning(nullptr, "Database Error", "  id exist : " + query.lastError().text());
            return true;
        } else {
            // id does not exist or query execution failed
            QMessageBox::information(nullptr, "Database Error", "  id does not exist : " + query.lastError().text());
            return false;
        }
}
bool assurances::ajouter()
{

    QSqlQuery query;
    QString res = QString::number(id_assurances);
    query.prepare("INSERT INTO assurance (id_assurances, type_assurances, prix_assurances) VALUES (:id_assurances, :type_assurances, :prix_assurances)");

    query.bindValue(":id_assurances", res);
    query.bindValue(":type_assurances", type_assurances);
    query.bindValue(":prix_assurances", prix_assurances);

    return query.exec();
}
bool assurances::supprimer(int id_assurances)
{
    QSqlQuery query;
    QString res =QString::number(id_assurances);
    query.prepare("delete from assurance where id_assurances=:id_assurances");
    query.bindValue(":id_assurances",res);


    return query.exec();
}
QSqlQueryModel * assurances::afficher()
{
    QSqlQueryModel *model=new QSqlQueryModel();
    model->setQuery("select id_assurances,type_assurances,TO_CHAR(prix_assurances)from assurance");
    model->setHeaderData(0,Qt::Horizontal,QObject::tr("id_assurances"));
    model->setHeaderData(1,Qt::Horizontal,QObject::tr("type_assurances"));
    model->setHeaderData(2,Qt::Horizontal,QObject::tr("prix_assurances"));

    return model;
}
bool assurances::modifier(int id_assurances, QString type_assurances, int prix_assurances)
{
    QSqlQuery query;
    query.prepare("UPDATE assurance SET type_assurances = :type_assurances, prix_assurances = :prix_assurances WHERE id_assurances = :id_assurances");

    query.bindValue(":id_assurances", id_assurances);
    query.bindValue(":type_assurances", type_assurances);
    query.bindValue(":prix_assurances", prix_assurances);

    qDebug() << "SQL Query: " << query.lastQuery();

    if (query.exec()) {
        qDebug() << "Modification successful!";
        return true;
    } else {
        qDebug() << "Modification failed. Error: " << query.lastError().text();
        return false;
    }
}

bool assurances::supprimer_all()
{
    QSqlQuery query;
    query.prepare("TRUNCATE TABLE assurances");
    return query.exec();
}

assurances assurances::getEventById(int id_assurances)
{
    QSqlQuery query;
    assurances ass;
    query.prepare("SELECT * FROM assurances WHERE id_assurances= :id");
    query.bindValue(":id", id_assurances);

    if(query.exec() && query.next())
    {

        ass.set_id_assurances(query.value(0).toInt());
        ass.set_type_assurances(query.value(1).toString());
        ass.set_prix_assurances(query.value(2).toInt());

    }

    return ass;
}
QSqlQueryModel *assurances::trierParId()
{
    QSqlQueryModel *model = new QSqlQueryModel();
    model->setQuery("SELECT * FROM assurance ORDER BY id_assurances ASC");
    return model;
}

QSqlQueryModel *assurances::rechercherParId(int id)
{
    QSqlQueryModel *model = new QSqlQueryModel();
    QSqlQuery query;
    query.prepare("SELECT * FROM assurance WHERE id_assurances = :id");
    query.bindValue(":id", id);
    if (query.exec()) {
        model->setQuery(query);
    } else {
        qDebug() << "Error executing query: " << query.lastError().text();
    }
    return model;


}

bool assurances::controleprix()
{

    if (QString::number(prix_assurances) != QString::fromStdString(std::to_string(prix_assurances))) {
        QMessageBox::critical(nullptr, QObject::tr("Erreur de saisie"),
            QObject::tr("Le prix doit être un nombre entier."),
            QMessageBox::Cancel);
        return false;
    }

    return true;
}

bool assurances::on_word_clicked()
{
    QSqlQuery query("SELECT * FROM assurance");

    QTextDocument doc;
    QTextCursor cursor(&doc);

    QString tableau= "<h1>liste assurances</h1>";
    tableau += "<table style='border-collapse: collapse; width: 100%;'>";
    tableau += "<thead><tr>"
                   "<th style='border: 1px solid #000; padding: 8px; text-align: left;font-weight: bold;'>ID_ASSURANCES</th>"
                   "<th style='border: 1px solid #000; padding: 8px; text-align: left;font-weight: bold;'>TYPE_ASSURANCES</th>"
                   "<th style='border: 1px solid #000; padding: 8px; text-align: left;font-weight: bold;'>PRIX_ASSURANCES</th>"

                   "</tr></thead>";
    tableau += "<tbody>";
    while (query.next()) {
       tableau += "<tr>";
        for (int i = 0; i < query.record().count(); ++i) {
            tableau += "<td style='border: 1px solid #000; padding: 8px;'>" + query.value(i).toString() + "</td>";
        }
        tableau += "</tr>";
    }

   tableau+= "</tbody></table>";
    doc.setHtml(tableau);

    QString documentsPath = QStandardPaths::writableLocation(QStandardPaths::DocumentsLocation);
    QString filePath = documentsPath + "/assurances.pdf";

    QPrinter printer;
    printer.setOutputFormat(QPrinter::PdfFormat);
    printer.setOutputFileName(filePath);

    doc.print(&printer);

    if (doc.isEmpty()) {
        qDebug() << "Error printing to PDF:";
        return false;
    }

    qDebug() << "PDF exported successfully to:" << filePath;
    return true;
}

QMap<QString, double> assurances::getStatsBytypePercentage() {
    QMap<QString, double> stats;
    QSqlQuery query;
    query.exec("SELECT type_assurances, COUNT(*) FROM assurance GROUP BY type_assurances");
    int totalassurance = 0;
    while (query.next()) {
        QString type_assurances = query.value(0).toString();
        int count = query.value(1).toInt();
        stats[type_assurances] = count;
        totalassurance += count;
    }
    for (auto it = stats.begin(); it != stats.end(); ++it) {
        it.value() = (it.value() / totalassurance) * 100.0;
    }
    return stats;
}

QSqlQueryModel* assurances::afficherParType(QString type_assurances) {
    QSqlQueryModel * model = new QSqlQueryModel();
    QString queryStr = "SELECT * FROM assurance WHERE type_assurances = :type_assurances";
    QSqlQuery query;
    query.prepare(queryStr);
    query.bindValue(":type_assurances", type_assurances);
    if (query.exec()) {
        model->setQuery(query);
    }
    return model;
}

