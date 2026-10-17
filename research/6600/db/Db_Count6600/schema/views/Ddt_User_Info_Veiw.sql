-- VIEW dbo.Ddt_User_Info_Veiw (modified 2011-04-13T00:53:18.797)

CREATE VIEW [dbo].[Ddt_User_Info_Veiw]
AS
SELECT    CAST(0 AS Int) AS UserID, 
          CAST('' AS varchar(400)) AS UserName, 
          CAST('' AS varchar(100)) AS NickName,
          CAST('2009-01-01' AS Datetime) AS Date,
          CAST('' AS varchar(100)) AS Consortia,
          Cast(0 As Varchar(10)) As Sexs,
          Cast(0 As Int)As  Win, 
          Cast(0 As Int)As  Total,
          Cast(0 As Int)AS  [Escape],
          Cast(0 As Int)AS  GP,
          CAST('' AS varchar(100)) AS  Honor,
          Cast(0 As Int)AS   Gold, 
          Cast(0 As Int)AS  Money, 
          Cast(0 As Int)AS Grade,
          Cast(0 As Int)AS State, 
          Cast(0 As Int)As Repute, 
          CAST('2009-01-01' AS Datetime) As  LastDate, 
          CAST('2009-01-01' AS Datetime) As  ChargeDate, 
          CAST('2009-01-01' AS Datetime) As  ExpendDate, 
          CAST('' AS varchar(100)) AS  ActiveIP,
          CAST('2009-01-01' AS Datetime) As ForbidDate, 
          Cast(0 As Int)AS Offer,
          Cast(0 As Bit) As IsExist,
          Cast(0 As Int)AS ReputeOffer,
          CAST('2009-01-01' AS Datetime)  As LastDateSecond, 
          CAST('2009-01-01' AS Datetime)  As  LastDateThird,
          Cast(0 As Int) LoginCount, 
          CAST('2009-01-01' AS Datetime)  As OnlineTime, 
          Cast(0 As Int)AS       AntiAddiction,
          CAST('2009-01-01' AS Datetime)  As AntiDate


GO
