-- VIEW dbo.Ddt_User_Mail_Veiw (modified 2011-04-13T00:53:18.797)
CREATE VIEW [dbo].[Ddt_User_Mail_Veiw]
AS
SELECT 
 CAST('' AS varchar(100)) AS MailType,
 CAST('' AS varchar(100)) AS Sender,
 CAST('' AS varchar(100)) AS Receiver,
 CAST('' AS varchar(200)) AS Title,
 CAST('' AS varchar(1000)) AS Content,
 CAST('2009-01-01' AS DateTime) AS SendTime,
 CAST('' AS varchar(10)) AS ReadStatic,
 CAST('' AS varchar(10)) AS DelStatic,
 CAST(0 AS Int) AS EndGold,
 CAST(0 AS Int) AS EndMoney,
 CAST(0 AS Int) AS EndGiftToken,
 CAST('' AS varchar(10)) AS OldGold,
 CAST('' AS varchar(10)) AS OldMoney, 
 CAST('' AS varchar(10)) AS OldGiftToken, 
 CAST('' AS varchar(20)) AS TypeStatics,
 CAST('' AS varchar(50)) AS EndAnnex1,
 CAST('' AS varchar(50)) AS EndAnnex2,
 CAST('' AS varchar(50)) AS EndAnnex3,
 CAST('' AS varchar(50)) AS EndAnnex4,
 CAST('' AS varchar(50)) AS EndAnnex5,
 CAST('' AS Varchar(50)) AS OldAnnex1,
 CAST('' AS Varchar(50)) AS OldAnnex2,
 CAST('' AS Varchar(50)) AS OldAnnex3,
 CAST('' AS Varchar(50)) AS OldAnnex4,
 CAST('' AS Varchar(50)) AS OldAnnex5,
 CAST(0 AS Int) AS ValidDate,
 CAST('' AS varchar(100)) AS Good1Name,
 CAST('' AS varchar(100)) AS Good2Name,
 CAST('' AS varchar(100)) AS Good3Name,
 CAST('' AS varchar(100)) AS Good4Name,
 CAST('' AS varchar(100)) AS Good5Name





GO
