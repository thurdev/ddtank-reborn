-- SQL_SCALAR_FUNCTION dbo.GetTranslation (modified 2025-11-03T04:46:29.383)

--获取语言包
CREATE    FUNCTION [dbo].[GetTranslation](@TranslationID as nvarchar(200))
RETURNS nvarchar(200) as
BEGIN
 --定义变量
 declare @language as nvarchar(200)
 declare @translated as nvarchar(200)
 SET @language='Vietnam'
 SELECT @language=ISNULL(value,'Vietnam') FROM dbo.Server_Config WHERE Name='Language'

 --调用相应的函数
 

 SELECT @translated  =
     CASE @language     
     WHEN 'Chinese' THEN dbo.ChineseTranslation(@TranslationID)        --简体中文 
     WHEN 'English' THEN dbo.EnglishTranslation(@TranslationID)        --英文
     WHEN 'Traditional' THEN dbo.TraditionalTranslation(@TranslationID)--繁体
     WHEN 'Vietnam' THEN dbo.VietnamTranslation(@TranslationID)        --越南文
     ELSE dbo.ChineseTranslation(@TranslationID) end
 return @translated
end 

















GO
