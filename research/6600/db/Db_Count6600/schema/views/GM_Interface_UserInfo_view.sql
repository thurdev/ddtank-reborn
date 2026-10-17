-- VIEW dbo.GM_Interface_UserInfo_view (modified 2011-04-13T00:53:18.827)
/*--------Author:Jason  Description: YesWan 接口  Date:2009-12-29*/
CREATE    View [dbo].[GM_Interface_UserInfo_view] AS
SELECT 
CAST('' AS int) AS UserID, 
CAST('' AS nvarchar(20)) AS UserName,
CAST('' AS nvarchar(20)) AS PasswordTwo, 
CAST('' AS nvarchar(20)) AS NickName, 
CAST('' AS datetime) AS Date,
CAST('' AS bit)  AS IsConsortia,
CAST('' AS int) AS ConsortiaID,
CAST('' AS  nvarchar(20)) AS ConsortiaName, 
CAST('' AS int) AS Win,
CAST('' AS int) AS Total,
CAST('' AS int) AS GP, 
CAST('' AS nvarchar(20)) AS Honor,
CAST('' AS int) AS Gold, 
CAST('' AS int) AS Money,
CAST('' AS int) AS Grade,
CAST('' AS int) AS State,
CAST('' AS int) AS IsFirst,
CAST('' AS int) AS Repute,
CAST('' AS datetime) AS LastDate, 
CAST('' AS datetime) AS ChargeDate,
CAST('' AS datetime) AS ExpendDate, 
CAST('' AS nvarchar(20)) AS ActiveIP,
CAST('' AS int) AS Offer,
CAST('' AS bit) AS IsExist,
CAST('' AS datetime) AS LastDateSecond, 
CAST('' AS datetime) AS LastDateThird,
CAST('' AS int) AS LoginCount, 
CAST('' AS int) AS OnlineTime,
CAST('' AS bit) AS IsMarried,
CAST('' AS int) AS SpouseID,
CAST('' AS nvarchar(20)) AS SpouseName,
CAST('' AS int) AS MarryInfoID,
CAST('' AS bit) AS IsCreatedMarryRoom,
CAST('' AS int) AS SelfMarryRoomID,
CAST('' AS bit) AS IsGotRing



GO
