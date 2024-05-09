#include "gestion_assuranes.h"
#include "ui_gestion_assuranes.h"
#include "gestion_assuranes.h"
#include "assurances.h"
#include <QSqlDatabase>
#include <QSqlError>
#include <QSqlQuery>
#include <QSqlQueryModel>
#include <QMessageBox>
#include <QMainWindow>
#include "assurances.h"
#include <QString>
#include <QDebug>
#include <QDesktopServices>
#include <QUrl>
#include <QMessageBox>
#include <QTextDocument>
#include <QTextDocumentWriter>
#include <QFileDialog>
#include<QSqlQueryModel>
#include <QtCharts/QChart>
#include <QtCharts/QPieSeries>
#include <QtCharts/QChartView>
#include <QtCharts/QLegend>
#include <QtCharts/QLegendMarker>
#include <QtCharts>
#include <QPdfWriter>
#include <QPainter>
#include <QFileDialog>
#include<QMessageBox>
#include<QString>
#include <QObject>
#include <QModelIndexList>
#include <QUrl>
#include <QDesktopServices>
#include "smtpclient.h"
#include "mimepart.h"
#include "mimeattachment.h"
#include "emailaddress.h"
#include "mimetext.h"





gestion_assuranes::gestion_assuranes(QWidget*parent)
     :QMainWindow(parent)
     ,ui(new Ui::gestion_assuranes)
{

    ui->setupUi(this);
       ui->tableView->setModel(etmp.afficher());

}

gestion_assuranes::~gestion_assuranes()
{
    delete ui;

}




void gestion_assuranes::on_supprimer1_clicked()
{

    QModelIndexList selectedIndexes = ui->tableView->selectionModel()->selectedIndexes();


    if (!selectedIndexes.isEmpty()) {

        QMessageBox msgBox;
        msgBox.setText("Are you sure you want to delete this entry?");
        msgBox.setStandardButtons(QMessageBox::Yes | QMessageBox::No);
        msgBox.setDefaultButton(QMessageBox::No);
        int reply = msgBox.exec();

        if (reply == QMessageBox::Yes) {

            QSqlQueryModel *model = qobject_cast<QSqlQueryModel*>(ui->tableView->model());

            if (model) {
                QSet<int> selectedRows;

                foreach(const QModelIndex &selectedIndex, selectedIndexes) {
                    int row = selectedIndex.row();
                    if (!selectedRows.contains(row)) {
                        // Access data from the first column of the selected row
                        QModelIndex firstColumnIndex = model->index(row, 0);
                        QVariant cellData = model->data(firstColumnIndex);
                        if (!etmp.supprimer(cellData.toInt())) {
                            QMessageBox::warning(this, "Error", "Failed to delete the entry.");
                        }
                        selectedRows.insert(row);
                    }
                }

                ui->tableView->setModel(etmp.afficher());
                QMessageBox::information(this, "Success", "Entry(s) deleted successfully.");
            }
        }
    } else {

        QMessageBox::warning(this, "Warning", "Please select an entry to delete.");
    }
}



void gestion_assuranes::on_supprimer2_clicked()
{
      ui->stackedWidget->setCurrentIndex(1);
}



void gestion_assuranes::on_ajouter_clicked()
{
    qDebug() << "coucou";
    QString id_assurances = ui->id->text();
    if (id_assurances.length() != 4) {
        QMessageBox::critical(nullptr, QObject::tr("Erreur de saisie"),
                              QObject::tr("L'ID doit contenir exactement 4 chiffres."),
                              QMessageBox::Cancel);
        return;
    }
    int id = ui->id->text().toInt();
    QString type = ui->type->currentText();
    bool isPriceValid = false;
    int prix = ui->prix->text().toInt(&isPriceValid);
    if (!isPriceValid) {
        QMessageBox::critical(nullptr, QObject::tr("Erreur de saisie"),
                              QObject::tr("Le prix ne doit pas être une chaine ."),
                              QMessageBox::Cancel);
        return;
    }
    assurances a(id, type, prix);
    bool test = a.ajouter();
    if (test) {
        ui->tableView->setModel(a.afficher());
        QMessageBox::information(nullptr, QObject::tr("ok"),
                                 QObject::tr("Ajout effectué.\n"
                                             "Cliquez sur Annuler pour quitter."), QMessageBox::Cancel);
    } else {
        QMessageBox::critical(nullptr, QObject::tr("non ok"),
                              QObject::tr("Ajout non effectué.\n"
                                          "Cliquez sur Annuler pour quitter."), QMessageBox::Cancel);
    }
}


void gestion_assuranes::on_modifier1_clicked()
{
    ui->stackedWidget->setCurrentIndex(1);
    QModelIndexList selectedIndexes = ui->tableView->selectionModel()->selectedIndexes();


    QSqlQueryModel *model = qobject_cast<QSqlQueryModel*>(ui->tableView->model());

    if (model && !selectedIndexes.isEmpty()) {

        QModelIndex firstSelectedIndex = selectedIndexes.first();


        int id_assurances = model->data(model->index(firstSelectedIndex.row(), 0)).toInt();
        QString type_assurances = model->data(model->index(firstSelectedIndex.row(), 1)).toString();
        int prix_assurances = model->data(model->index(firstSelectedIndex.row(), 2)).toInt();


        ui->id_2->setText(QString::number(id_assurances));
        ui->type_2->setCurrentText(type_assurances);
        ui->prix_2->setText(QString::number(prix_assurances));
    ui->tableView->setModel(etmp.afficher());
    }
}

void gestion_assuranes::on_trier_clicked()
{
         ui->tableView->setModel(etmp.trierParId());
}


void gestion_assuranes::on_pushButton_14_clicked()

    {
    qDebug() << "coucou";
        int id = ui->lineEdit->text().toInt();
        ui->tableView->setModel(etmp.rechercherParId(id));

    }


void gestion_assuranes::on_modifier1_2_clicked()
{

    int id2_assurances = ui->id_2->text().toInt();
    QString new_type_assurances = ui->type_2->currentText();
    int prix_assurances = ui->prix_2->text().toInt();


    if (new_type_assurances != old_type_assurances) {

        bool success = etmp.modifier(id2_assurances, new_type_assurances, prix_assurances);
        if (success) {
            QMessageBox::information(this, "Success", "Modification successful");

        } else {
            QMessageBox::warning(this, "Error", "Failed to modify the entry");
        }
    } else {
        QMessageBox::warning(this, "Error", "New type must be different from the old type");
    }
     ui->tableView->setModel(etmp.afficher());


}

void gestion_assuranes::on_menu_clicked()
{
      ui->stackedWidget->setCurrentIndex(0);
}





void gestion_assuranes::on_word_clicked()
{

    {
        if (etmp.on_word_clicked()==true) {
                   QMessageBox::information(this, "Done", "PDF exported successfully!");
               } else {
                   QMessageBox::critical(this, "Error", "Failed to export PDF!");
              }
    }

}



void gestion_assuranes::on_statics_clicked()
{
    assurances assurances;
    QMap<QString, double> stats = assurances.getStatsBytypePercentage();


    QPieSeries *series = new QPieSeries();
    for (auto it = stats.begin(); it != stats.end(); ++it) {
        QString label = QString("%1 (%2%)").arg(it.key()).arg(it.value(), 0, 'f', 1);
        series->append(label, it.value());
    }
    QChart *chart = new QChart();
    chart->addSeries(series);
    chart->setTitle("Statistiques sur le type d'assurances");
    chart->legend()->setVisible(true);
    chart->legend()->setAlignment(Qt::AlignRight);
    QChartView *chartView = new QChartView(chart);
    chartView->setRenderHint(QPainter::Antialiasing);
    chartView->resize(400, 300);
    chartView->show();
}
void gestion_assuranes::on_pushButton_12_clicked()
{
        QSqlQueryModel *model = qobject_cast<QSqlQueryModel*>(ui->tableView->model());
        if (!model) {
            qDebug() << "Error: Model not found.";
            return;
        }
        double prixTotal = 0.0;
        for (int row = 0; row < model->rowCount(); ++row) {
            QModelIndex prixIndex = model->index(row, 2); // Colonne du prix dans le modèle
            QVariant prixData = model->data(prixIndex);
            if (prixData.isValid() && prixData.canConvert<int>()) {
                prixTotal += prixData.toInt(); // Ajouter le prix de chaque assurance au total
            }
        }
        QMessageBox::information(this, "Prix Total des Assurances",
                                 QString("Le prix total de toutes les assurances est : %1").arg(prixTotal));

}






void gestion_assuranes::on_pushButton_2_clicked()
{

    SmtpClient smtp("smtp-relay.brevo.com", 587, SmtpClient::TcpConnection);
    smtp.setUser("hidayahanafi03@gmail.com");
    smtp.setPassword("qKUjkYH42Dgb107G");

    MimeMessage message;
    message.setSender(new EmailAddress("Smartinsurance@gmail.com", "Smart Insurance"));
    message.addRecipient(new EmailAddress("nourmelki05@gmail.com", "Destinataire"));
    message.setSubject("Confirmation de traitement de votre demande d'assurance");

    QSqlQueryModel *model = qobject_cast<QSqlQueryModel*>(ui->tableView->model());
    if (model && model->rowCount() > 0) {
        int row = model->rowCount() - 1;
        QString type = model->index(row, 1).data().toString();
        int prix = model->index(row, 2).data().toInt();
        int id = model->index(row, 0).data().toInt();
        QString messageBody = "Nouvelle Assurance ajoutée :\n Nous sommes heureux de vous informer que votre demande d'assurance a été traitée avec succès. Votre police d'assurance est maintenant active et vous bénéficiez de la couverture prévue.\n N'hésitez pas à nous contacter si vous avez des questions ou des préoccupations supplémentaires \n"
                              "ID : " + QString::number(id) + "\n"
                              "Type : " + type + "\n"
                              "Prix : " + QString::number(prix) + "\n"

                              "Cordialement,";

        message.addPart(new MimeText(messageBody));
    } else {
        // Aucune assurance trouvée dans le modèle
        QMessageBox::warning(nullptr, QObject::tr("Aucune Assurance"),
                             QObject::tr("Aucune assurance n'a été ajoutée pour l'instant."),
                             QMessageBox::Cancel);
        return;
    }

    // Envoyer l'email
    if (!smtp.connectToHost()) {
        QMessageBox::critical(nullptr, QObject::tr("Erreur SMTP"),
                              QObject::tr("Échec de connexion au serveur SMTP. Abandon..."),
                              QMessageBox::Cancel);
        return;
    }

    if (!smtp.login()) {
        QMessageBox::critical(nullptr, QObject::tr("Erreur SMTP"),
                              QObject::tr("Échec de connexion au serveur SMTP. Abandon..."),
                              QMessageBox::Cancel);
        return;
    }

    if (!smtp.sendMail(message)) {
        QMessageBox::critical(nullptr, QObject::tr("Erreur SMTP"),
                              QObject::tr("Échec de l'envoi de l'email. Abandon..."),
                              QMessageBox::Cancel);
        return;
    }

    smtp.quit();

    QMessageBox::information(nullptr, QObject::tr("Email Envoyé"),
                             QObject::tr("Email envoyé avec succès."),
                             QMessageBox::Ok);
}


void gestion_assuranes::on_pushButton_3_clicked()
{

    QDialog dialog(this);
    dialog.setWindowTitle("Choisir le type d'assurance");

    QComboBox *comboBox = new QComboBox(&dialog);
    comboBox->addItem("Assurance voiture");
    comboBox->addItem(" Assurance obseques");
    comboBox->addItem("Assurance emprunteur");
    comboBox->addItem(" Assurance habitation");
    comboBox->addItem(" Assurance scolaire");


    QPushButton *okButton = new QPushButton("OK", &dialog);
    connect(okButton, &QPushButton::clicked, [&]() {
        QString selectedType = comboBox->currentText();
        ui->tableView->setModel(etmp.afficherParType(selectedType));
        dialog.close();
    });

    QVBoxLayout *layout = new QVBoxLayout(&dialog);
    layout->addWidget(comboBox);
    layout->addWidget(okButton);

    dialog.exec();
}
